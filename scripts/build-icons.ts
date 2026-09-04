import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* Сборка иконок приложения из двух SVG-исходников в theme/brand/.
 *
 * Всё, что лежит ниже в TARGETS, — артефакт: правится не он, а исходник, после
 * чего гоняется `pnpm build:icons`. Артефакты коммитятся, потому что Next
 * подхватывает favicon/icon/apple-icon по файловой конвенции на этапе сборки,
 * а public/icons/* адресуются из манифеста — генерировать их на проде нечем и
 * незачем.
 *
 * Исходников два, а не один: у maskable-варианта знак обязан помещаться в
 * центральный круг диаметром 80% холста, и из полноразмерного он туда не
 * влезает. */

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const SOURCES = {
  icon: "theme/brand/icon.svg",
  maskable: "theme/brand/icon-maskable.svg",
} as const;

/** Отпечаток исходников рядом с артефактами: единственное, что ловит замену
 *  SVG без пересборки растров. Сверяется тестом. */
export const LOCK_FILE = "theme/brand/icons.lock.json";

export interface IconTarget {
  file: string;
  size: number;
  from: keyof typeof SOURCES;
  /** Зачем файл нужен — чтобы следующий читатель не удалял «лишнее». */
  why: string;
  /** Скруглять углы. Только для вкладки браузера — см. TAB_CORNER_RATIO. */
  rounded?: true;
}

export const TARGETS: IconTarget[] = [
  { file: "src/app/favicon.ico", size: 32, from: "icon", why: "старые браузеры, закладки, история", rounded: true },
  { file: "src/app/apple-icon.png", size: 180, from: "icon", why: "«На экран Домой» в iOS" },
  { file: "public/icons/icon-192.png", size: 192, from: "icon", why: "PWA, список приложений Android" },
  { file: "public/icons/icon-512.png", size: 512, from: "icon", why: "PWA, splash, витрина установки" },
  {
    file: "public/icons/icon-maskable-512.png",
    size: 512,
    from: "maskable",
    why: "Android adaptive: система режет под форму лаунчера",
  },
];

/** src/app/icon.svg — вектор, а не растр: Яндекс для выдачи рекомендует именно
 *  SVG. Генерируется мимо TARGETS: это исходник, вычищенный и скруглённый. */
export const SVG_TARGET = "src/app/icon.svg";

/** Скругление углов для вкладки браузера, в долях стороны.
 *
 *  Скругляются ровно два адресата — icon.svg и favicon.ico. Вкладку никто не
 *  маскирует, там иконка показывается как есть, и острый угол выглядит
 *  наклейкой. Всё остальное остаётся квадратным намеренно: iOS и Android
 *  накладывают маску сами, и поверх нарисованных углов вышел бы двойной кант. */
export const TAB_CORNER_RATIO = 0.125;

/** Всё, что не рисует: проектная проза в комментариях и <metadata>. Последний
 *  редакторы набивают манифестом C2PA — это килобайты base64, которые иначе
 *  уезжали бы посетителю с каждой страницей вместе с icon.svg. */
export function stripNonVisual(svg: string): string {
  const markup = svg
    .replace(/<!--[\s\S]*?-->\s*/g, "")
    .replace(/<metadata\b[\s\S]*?<\/metadata>\s*/gi, "")
    .replace(/\n{2,}/g, "\n");

  // Объявления пространств имён, которыми после чистки никто не пользуется:
  // редакторы оставляют c2pa:, inkscape:, sodipodi: и им подобные висеть на
  // корневом теге. Префикс считается живым, только если встречается в разметке.
  return markup.replace(/\s+xmlns:([\w-]+)=("[^"]*"|'[^']*')/g, (declaration, prefix) =>
    new RegExp(`[<\\s]${prefix}:`).test(markup) ? declaration : "",
  );
}

const CLIP_ID = "inrenta-tab-corner";

/** Число в том виде, в каком его допускает SVG: со знаком, дробное, в
 *  экспоненциальной записи. Наивное `[\d.-]+` роняло бы разбор на легальном
 *  исходнике и врало бы при этом, что viewBox нет вовсе. */
const NUMBER = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?`;

/** Оборачивает содержимое в clip-path со скруглённым прямоугольником. Радиус
 *  считается от меньшей стороны viewBox, поэтому не зависит от холста. */
export function withRoundedCorners(svg: string, ratio = TAB_CORNER_RATIO): string {
  if (svg.includes(CLIP_ID)) {
    throw new Error(`в разметке уже есть id="${CLIP_ID}" — обёртка перебила бы чужой clip`);
  }

  // Кавычки учитываются: в значении атрибута символ «>» легален, и наивное
  // [^>]* оборвало бы открывающий тег на середине, записав битую разметку.
  const open = svg.match(/<svg\b(?:[^>"']|"[^"]*"|'[^']*')*>/i);
  if (!open) throw new Error("не найден корневой <svg>");
  const start = open.index! + open[0].length;
  const end = svg.lastIndexOf("</svg>");
  if (end < start) throw new Error("не найден закрывающий </svg>");

  const box = open[0].match(
    new RegExp(`viewBox\\s*=\\s*["']\\s*(${NUMBER})[\\s,]+(${NUMBER})[\\s,]+(${NUMBER})[\\s,]+(${NUMBER})`, "i"),
  );
  if (!box) throw new Error("у корневого <svg> нет viewBox — не от чего считать радиус");
  const [minX, minY, width, height] = box.slice(1, 5).map(Number);
  const radius = +(Math.min(width, height) * ratio).toFixed(2);

  // x и y — из viewBox, а не нули: при ненулевом начале координат прямоугольник
  // от 0,0 съехал бы относительно содержимого и срезал знак молча.
  const clip =
    `<defs><clipPath id="${CLIP_ID}">` +
    `<rect x="${minX}" y="${minY}" width="${width}" height="${height}" rx="${radius}" ry="${radius}"/>` +
    `</clipPath></defs>`;

  return (
    svg.slice(0, start) +
    clip +
    `<g clip-path="url(#${CLIP_ID})">` +
    svg.slice(start, end) +
    "</g>" +
    svg.slice(end)
  );
}

/** Требования к исходнику, которые иначе нарушаются молча. Проверяются на
 *  замене иконок — ради этого случая скрипт и написан. */
export function svgProblems(source: string): string[] {
  // Именно по рисующей разметке: <metadata> редактора содержит что угодно, в
  // том числе base64, в котором найдётся любая подстрока.
  const svg = stripNonVisual(source);
  const problems: string[] = [];
  if (/<text[\s>]/i.test(svg)) {
    problems.push("есть <text>: растеризацию делает librsvg, и без нужного шрифта он молча подставит чужой — переведите текст в кривые");
  }
  if (/<(image|use)[^>]*\bhref\s*=\s*["'](?!#)/i.test(svg)) {
    problems.push("есть внешняя ссылка в <image>/<use>: при растеризации она не разрешится");
  }
  return problems;
}

/** PNG, завёрнутый в контейнер ICO. sharp писать .ico не умеет (проверяется
 *  как `"ico" in sharp.format` → false), а тянуть зависимость ради двадцати
 *  байт заголовка незачем. PNG внутри ICO понимают все живые браузеры.
 *
 *  Формат нарушать нельзя молча: Next на сборке прогоняет favicon.ico через
 *  image-size, и кривой заголовок роняет `next build`, а не тест. */
export function pngToIco(png: Buffer, size: number): Buffer {
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0); // reserved, всегда 0
  dir.writeUInt16LE(1, 2); // тип 1 = иконка (2 был бы курсор)
  dir.writeUInt16LE(1, 4); // число изображений в файле

  const entry = Buffer.alloc(16);
  // Ширина и высота — по одному байту, поэтому 256 записывается нулём.
  entry.writeUInt8(size >= 256 ? 0 : size, 0);
  entry.writeUInt8(size >= 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2); // палитры нет
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // цветовых плоскостей
  entry.writeUInt16LE(32, 6); // бит на пиксель
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(dir.length + entry.length, 12); // смещение данных = 22

  return Buffer.concat([dir, entry, png]);
}

/** Обратный разбор — только чтобы проверить, что мы написали читаемый файл. */
export function icoPayload(ico: Buffer): { size: number; png: Buffer } {
  if (ico.readUInt16LE(0) !== 0 || ico.readUInt16LE(2) !== 1) {
    throw new Error("не ICO: испорчен ICONDIR");
  }
  const count = ico.readUInt16LE(4);
  if (count !== 1) throw new Error(`ожидалось одно изображение, в файле ${count}`);
  const width = ico.readUInt8(6) || 256;
  const length = ico.readUInt32LE(14);
  const offset = ico.readUInt32LE(18);
  const png = ico.subarray(offset, offset + length);
  if (png.length !== length) throw new Error("данные изображения обрезаны");
  return { size: width, png };
}

export function fingerprint(read: (file: string) => Buffer): Record<string, string> {
  const out: Record<string, string> = {};
  for (const file of Object.values(SOURCES)) {
    out[file] = createHash("sha256").update(read(file)).digest("hex");
  }
  return out;
}

// Сравнение путей, а не URL: file-URL percent-кодирует пробелы и кириллицу, и
// на таком пути скрипт молча вышел бы с нулём, ничего не собрав.
if (import.meta.filename === process.argv[1]) {
  const sharp = (await import("sharp")).default;
  const abs = (file: string) => path.join(REPO_ROOT, file);
  const write = (file: string, data: Buffer | string) => {
    fs.mkdirSync(path.dirname(abs(file)), { recursive: true });
    fs.writeFileSync(abs(file), data);
    console.log(`  ${file}`);
  };

  for (const file of Object.values(SOURCES)) {
    if (!fs.existsSync(abs(file))) {
      console.error(`✗ нет исходника ${file}`);
      process.exit(1);
    }
  }

  const svg = Object.fromEntries(
    Object.entries(SOURCES).map(([key, file]) => [key, fs.readFileSync(abs(file))]),
  ) as Record<keyof typeof SOURCES, Buffer>;
  const clean = {} as Record<keyof typeof SOURCES, Buffer>;

  // Исходники заменяет человек, а не этот скрипт, и типовой экспорт из
  // редактора нарушает сразу половину требований. Молча пропустить их нельзя:
  // прозрачный фон даёт чёрную плашку на iOS, неквадратный холст режется
  // `fit: "cover"` по краям — и то и другое обнаружится уже на устройстве.
  for (const [key, file] of Object.entries(SOURCES)) {
    const source = svg[key as keyof typeof SOURCES];
    const problems = svgProblems(source.toString());

    const meta = await sharp(source).metadata();
    if (meta.width !== meta.height) {
      problems.push(`холст ${meta.width}×${meta.height}, а нужен квадрат — иначе resize обрежет знак по краям`);
    }
    // Прозрачность проверяется на растре: в самом SVG её не увидеть.
    const { isOpaque } = await sharp(source).resize(512, 512).stats();
    if (!isOpaque) {
      problems.push("фон не сплошной — iOS положит иконку на чёрное, а Android подставит подложку лаунчера");
    }

    // Чистка идёт регулярками по чужой разметке, а рвётся такое тихо: съеденный
    // <metadata/> может унести с собой весь знак, и заметить это негде —
    // растры-то собираются из исходника, пустым останется только icon.svg.
    // Поэтому вычищенный вариант сверяется с исходником по пикселям.
    const cleaned = Buffer.from(stripNonVisual(source.toString()));
    try {
      const [before, after] = await Promise.all(
        [source, cleaned].map(b => sharp(b).resize(256, 256).raw().toBuffer()),
      );
      if (!before.equals(after)) {
        problems.push("после вычистки <metadata> и комментариев картинка изменилась — разметка порезана не по границам");
      }
    } catch {
      // Порезанная не по границам разметка чаще всего просто невалидна, и тогда
      // растеризация падает раньше сравнения.
      problems.push("после вычистки <metadata> и комментариев разметка перестала разбираться");
    }

    if (problems.length) {
      console.error(`✗ ${file}`);
      problems.forEach(p => console.error(`  - ${p}`));
      process.exit(1);
    }
    clean[key as keyof typeof SOURCES] = cleaned;
  }

  // Вкладка браузера: маску там никто не накладывает, скругляем сами.
  const roundedIcon = Buffer.from(withRoundedCorners(clean.icon.toString()));

  // Обёртка тоже правит чужую разметку и тоже способна испортить её молча:
  // прямоугольник, съехавший относительно содержимого, срежет знак, а сборка
  // пройдёт. Поэтому скруглённый вариант обязан отличаться от квадратного
  // ровно углами — и проверяется это до записи на диск.
  {
    const side = 256;
    const [flat, round] = await Promise.all(
      [clean.icon, roundedIcon].map(b => sharp(b).resize(side, side).ensureAlpha().raw().toBuffer()),
    );
    const corner = Math.ceil(side * TAB_CORNER_RATIO);
    let strayed = 0;
    for (let y = 0; y < side; y++) {
      for (let x = 0; x < side; x++) {
        const inCorner = (x < corner || x >= side - corner) && (y < corner || y >= side - corner);
        if (inCorner) continue;
        const i = (y * side + x) * 4;
        // Допуск в пару значений: изоляция группы даёт микросдвиг на кромках
        // антиалиасинга, геометрия при этом не едет.
        for (let c = 0; c < 4; c++) {
          if (Math.abs(flat[i + c] - round[i + c]) > 4) {
            strayed++;
            break;
          }
        }
      }
    }
    if (strayed > 0) {
      console.error(`✗ ${SVG_TARGET}`);
      console.error(`  - скругление задело ${strayed} пикселей вне углов: clip съехал относительно содержимого`);
      process.exit(1);
    }
    if (round[3] !== 0) {
      console.error(`✗ ${SVG_TARGET}`);
      console.error("  - угол не стал прозрачным: скругление не применилось");
      process.exit(1);
    }
  }

  console.log("Иконки из theme/brand/:");
  write(SVG_TARGET, roundedIcon);

  for (const target of TARGETS) {
    const source = target.rounded ? roundedIcon : clean[target.from];
    const png = await sharp(source).resize(target.size, target.size).png().toBuffer();

    if (target.file.endsWith(".ico")) {
      const ico = pngToIco(png, target.size);
      // Разбираем обратно и проверяем растром: невалидный ICO иначе всплыл бы
      // только на `next build`.
      const { size, png: payload } = icoPayload(ico);
      const meta = await sharp(payload).metadata();
      if (size !== target.size || meta.width !== target.size || meta.height !== target.size) {
        console.error(`✗ ${target.file}: заголовок обещает ${size}, внутри ${meta.width}×${meta.height}`);
        process.exit(1);
      }
      write(target.file, ico);
    } else {
      write(target.file, png);
    }
  }

  write(LOCK_FILE, JSON.stringify(fingerprint(file => fs.readFileSync(abs(file))), null, 2) + "\n");
  console.log("✓ готово");
}

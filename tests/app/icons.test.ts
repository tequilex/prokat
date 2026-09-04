import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { seo } from "@theme/seo";
import manifest from "@/app/manifest";
import {
  LOCK_FILE,
  SOURCES,
  SVG_TARGET,
  TARGETS,
  fingerprint,
  icoPayload,
  stripNonVisual,
  withRoundedCorners,
} from "../../scripts/build-icons";

const abs = (file: string) => join(process.cwd(), file);
const read = (file: string) => readFileSync(abs(file));

/** Ширина и высота из IHDR: сигнатура 8 байт + длина 4 + тип 4, дальше пара
 *  uint32. Тянуть sharp в тест ради этого незачем. */
function pngSize(buf: Buffer): { width: number; height: number } {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe("иконки приложения", () => {
  it("отдаёт из манифеста только существующие файлы заявленного размера", () => {
    const icons = manifest().icons ?? [];
    expect(icons.length).toBeGreaterThan(0);

    for (const icon of icons) {
      const file = join("public", icon.src!);
      expect(existsSync(abs(file)), `${file} нет на диске`).toBe(true);

      const [w, h] = icon.sizes!.split("x").map(Number);
      expect(pngSize(read(file)), `${file} не совпал с sizes манифеста`).toEqual({
        width: w,
        height: h,
      });
    }
  });

  // Без maskable Android вписывает квадрат в круг лаунчера, оставляя белую
  // подложку по краям. Отдельной записью, а не purpose "any maskable": знак с
  // полями не должен уезжать туда, где обрезки нет.
  it("везёт отдельную maskable-иконку для Android", () => {
    const maskable = (manifest().icons ?? []).filter(i => i.purpose === "maskable");
    expect(maskable).toHaveLength(1);
    expect(maskable[0].sizes).toBe("512x512");

    const any = (manifest().icons ?? []).filter(i => i.purpose === "any");
    expect(any.map(i => i.sizes).sort()).toEqual(["192x192", "512x512"]);
  });

  // Эти три Next подхватывает файловой конвенцией, в манифесте их нет, и
  // пропажу заметить больше нечем: вкладка и iOS просто останутся пустыми.
  it("держит вкладку браузера и иконку iOS на месте", () => {
    for (const file of [SVG_TARGET, "src/app/favicon.ico", "src/app/apple-icon.png"]) {
      expect(existsSync(abs(file)), `${file} нет на диске`).toBe(true);
    }
    expect(pngSize(read("src/app/apple-icon.png"))).toEqual({ width: 180, height: 180 });
  });

  // icon.svg генерируется мимо TARGETS и отпечатков в lock-файле: это исходник,
  // вычищенный и скруглённый. Правку руками ловить больше нечем — она бы просто
  // уехала посетителям.
  it("держит icon.svg вычищенным и скруглённым исходником", () => {
    const served = read(SVG_TARGET).toString();
    expect(served).toBe(withRoundedCorners(stripNonVisual(read(SOURCES.icon).toString())));
    expect(served).not.toContain("<!--");
    // Редакторы набивают <metadata> манифестом C2PA на килобайты base64.
    expect(served).not.toMatch(/<metadata\b/i);
  });

  // Скругление — только для вкладки. На iOS и Android маску накладывает
  // система, и поверх нарисованных углов вышел бы двойной кант.
  it("скругляет только вкладку, остальное оставляет квадратным", () => {
    expect(TARGETS.filter(t => t.rounded).map(t => t.file)).toEqual(["src/app/favicon.ico"]);
    expect(read(SVG_TARGET).toString()).toContain("clipPath");
  });

  // sharp .ico не пишет, контейнер собран руками. Кривой заголовок роняет не
  // тест, а `next build` — Next читает favicon.ico через image-size.
  it("собирает favicon.ico читаемым контейнером", () => {
    const { size, png } = icoPayload(read("src/app/favicon.ico"));
    expect(size).toBe(32);
    expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(pngSize(png)).toEqual({ width: 32, height: 32 });
  });

  // Смысл задачи в том, что исходники заменят. Заменят и забудут пересобрать —
  // в проде останутся старые растры, и не упадёт ровно ничего.
  it("держит растры пересобранными под текущие исходники", () => {
    const lock = JSON.parse(read(LOCK_FILE).toString());
    expect(lock, `исходники изменились — прогоните \`pnpm build:icons\``).toEqual(fingerprint(read));

    for (const target of TARGETS) {
      expect(existsSync(abs(target.file)), `${target.file} нет на диске`).toBe(true);
    }
    for (const source of Object.values(SOURCES)) {
      expect(existsSync(abs(source)), `${source} нет на диске`).toBe(true);
    }
  });

  // Оба цвета — дубли одного CSS-токена: ни в <meta>, ни в манифест переменную
  // не подставить. Сторожатся порознь, потому что смысл у них разный
  // (обвязка браузера против splash-экрана) и однажды они разойдутся намеренно.
  it("держит цвета браузерной обвязки равными фону тёмной темы", () => {
    const css = readFileSync(abs("theme/tokens.css"), "utf8");
    const dark = css.match(/\.dark\s*\{([^}]*)\}/m)?.[1] ?? "";
    const background = dark.match(/--color-background:\s*(#[0-9a-f]{3,8})/i)?.[1];

    expect(background).toBeDefined();
    expect(seo.themeColor.toLowerCase()).toBe(background!.toLowerCase());
    expect(manifest().background_color?.toLowerCase()).toBe(background!.toLowerCase());
  });
});

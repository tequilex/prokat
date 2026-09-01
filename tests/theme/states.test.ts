import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/* Сторож языка состояний.
 *
 * Линтера в проекте нет, `tsc` классов Tailwind не видит, а check-theme смотрит
 * только в CSS — ничто не мешало писать `hover:bg-muted/60`. Ровно так и
 * накопились одиннадцать вариантов наведения в восемнадцати файлах.
 *
 * Ловится ЗНАЧЕНИЕ, а не имя варианта, и исключения заданы по классу, а не по
 * файлу: файл в белом списке перестал бы проверяться целиком и стал бы штатным
 * способом обойти правило.
 *
 * Правило — theme/tokens.schema.md, раздел «Состояния», и docs/decisions/0008. */

// Варианты, после которых заливка означает состояние. Список закрытый:
// незнакомый вариант — повод сначала подумать, а не молча пройти проверку.
const VARIANTS = [
  "hover", "focus", "focus-visible", "focus-within", "active", "checked",
  "peer-checked", "peer-focus", "group-hover", "group-focus",
  "has-\\[:checked\\]", "aria-selected", "aria-current", "aria-pressed",
  "data-\\[highlighted\\]", "data-\\[state=[a-z]+\\]", "data-\\[selected\\]",
];

const FILL = new RegExp(`(${VARIANTS.join("|")}):(bg-\\[?[a-z0-9/.\\[\\]#-]+)`, "g");

// Заливка состояния, применяемая CSS-вариантом. Наведение сюда не входит
// намеренно: оно рисуется классом .hoverable, накладкой поверх собственной
// заливки. Вариант bg-* её бы ЗАМЕНИЛ, и элемент с собственным фоном терял бы
// его — на карточке ховер тогда падает до 1.005 вместо 1.15.
const ALLOWED = new Map<string, string[]>([
  // Выбранное, где состояние держит сам input, а тернара нет.
  ["bg-selected", ["has-[:checked]", "peer-checked", "aria-selected", "checked"]],
  // Тумблер: сплошная охра — заливка включённого контрола, а не накладка.
  ["bg-accent", ["peer-checked"]],
  // Кнопки: у сплошных вариантов темнеет собственный цвет, а не подложка.
  ["bg-primary/90", ["hover"]],
  ["bg-destructive/90", ["hover"]],
  // Поверх фотографии: снимок своей темы не знает, накладка от текста
  // интерфейса там означала бы не то. См. «Исключения» в tokens.schema.md.
  ["bg-white/20", ["hover"]],
  ["bg-black/15", ["group-hover"]],
  ["bg-background", ["hover"]],
]);

function sources(dir: string, exts: string[]): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && exts.some((x) => e.name.endsWith(x)))
    .map((e) => join(e.parentPath ?? e.path, e.name));
}

describe("язык состояний", () => {
  it("заливка состояния берётся только из разрешённого набора", () => {
    const offenders: string[] = [];

    for (const file of sources("src", [".ts", ".tsx"])) {
      const text = readFileSync(file, "utf8");
      for (const [, variant, value] of text.matchAll(FILL)) {
        // Разрешение привязано к варианту: bg-selected законен у чекбокса, но
        // hover:bg-selected — двойное нарушение (не накладка и ховер поверх
        // выбранного), и проходить не должен.
        if (!ALLOWED.get(value)?.includes(variant)) {
          offenders.push(`${relative(process.cwd(), file)}: ${variant}:${value}`);
        }
      }
    }

    expect(offenders, [
      "Заливка состояния мимо контракта. Наведение — класс .hoverable,",
      "он рисует накладку ПОВЕРХ заливки; hover:bg-* её заменяет.",
      "См. theme/tokens.schema.md, раздел «Состояния».",
    ].join(" ")).toEqual([]);
  });

  // Ховер поверх выбранного делает активный пункт под курсором иным, чем в
  // покое. Ищем в выражении className целиком, а не в отдельном литерале:
  // весь код написан шаблонными строками и cn(), до одиночных литералов
  // проверка не доходила.
  it("наведение не рисуется поверх выбранного", () => {
    const offenders: string[] = [];

    for (const file of sources("src", [".ts", ".tsx"])) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/className=\{([\s\S]*?)\}\s*(?:\/?>|\n\s*[a-zA-Z-]+=)/g)) {
        const expr = m[1];
        // Тернар — законный приём: ветки взаимоисключающие.
        if (expr.includes("?")) continue;
        if (expr.includes("hoverable") && expr.includes("bg-selected")) {
          offenders.push(`${relative(process.cwd(), file)}: ${expr.slice(0, 80)}`);
        }
      }
    }

    expect(offenders, "Наведение и выбранное на одном элементе — разведите тернаром")
      .toEqual([]);
  });

  // В globals.css состояния написаны сырым CSS, классов Tailwind там нет —
  // проверка выше их не видит. Заливка наведения и там обязана быть накладкой.
  it("в globals.css наведение красится только токеном накладки", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const offenders = [...css.matchAll(/:hover[^{]*\{[^}]*background(?:-color)?:\s*([^;]+);/g)]
      .map((m) => m[1].trim())
      .filter((value) => !value.includes("--color-hover"));

    expect(offenders, "Наведение в CSS — только var(--color-hover)").toEqual([]);
  });
});

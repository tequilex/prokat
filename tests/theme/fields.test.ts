import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/* Сторож полей ввода.
 *
 * Вид поля задан один раз в src/components/ui/field.ts. Собранное вручную поле
 * выглядит иначе — так поиск в чате оказался на bg-muted и не совпадал с
 * поиском в шапке. Ни tsc, ни check-theme такого не видят.
 *
 * Проверяется КАЖДОЕ поле, а не файл целиком: файл, где одно поле по контракту,
 * а второе собрано руками, иначе проходил бы молча. */

// field — для самого поля, fieldWithin — для обёртки, внутри которой лежит
// прозрачный input: focus-visible на обёртке не срабатывает, там нужен
// focus-within. Перепутать их — значит остаться без кольца фокуса.
//
// Формы бывают три: прямая подстановка, локальный псевдоним
// (`const INPUT = `${field} h-11``) и передача пропом. Псевдонимы собираются
// по файлу — без этого сторож ругался бы на половину форм проекта.
function contractNames(text: string): RegExp {
  const aliases = [...text.matchAll(/const\s+(\w+)\s*=\s*`\$\{(?:field|fieldWithin)\}/g)]
    .map((m) => m[1]);
  return new RegExp([`\\$\\{field(?:Within)?\\}`, ...aliases.map((a) => `\\{${a}\\}|\\$\\{${a}\\}`)]
    .join("|"));
}

const ALLOWED = new Map([
  // Обёртка над <input>: className приходит от вызывающего, контракт
  // применяется там. Сам компонент вида не задаёт.
  ["src/components/ui/PasswordInput.tsx", "прокидывает className"],
]);

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && e.name.endsWith(".tsx"))
    .map((e) => join(e.parentPath ?? e.path, e.name));
}

/** Тег целиком, со вложенными фигурными скобками обработчиков: обрыв на первом
 *  `>` разрезал бы <input onChange={(e) => …} /> посередине и давал ложные
 *  срабатывания в зависимости от порядка атрибутов. */
function tags(source: string, name: string): string[] {
  // Комментарии выбрасываются: в SortMenu слово «<select>» встречается в
  // объяснении, почему сортировка сделана ссылками, а не селектом.
  const text = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const found: string[] = [];
  const re = new RegExp(`<${name}\\b`, "g");
  for (const m of text.matchAll(re)) {
    let depth = 0;
    for (let i = m.index; i < text.length; i++) {
      const ch = text[i];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (ch === ">" && depth === 0) { found.push(text.slice(m.index, i + 1)); break; }
    }
  }
  return found;
}

// Вида не имеют: скрытые, унесённые за экран (honeypot против ботов) и
// ползунки — у последних своя разметка в globals.css, заливка и кант поля им
// не подходят по природе.
//
// Проверяются именно атрибуты, а не вхождение подстроки: "hidden" встречается
// в overflow-hidden и aria-hidden, и по подстроке сторож молчал бы на живых
// полях.
function isInvisible(tag: string): boolean {
  return /type="(hidden|range)"/.test(tag)
    || /aria-hidden="true"/.test(tag)
    || /className="[^"]*\b(sr-only|hidden)\b/.test(tag)
    || /-left-\[9999px\]/.test(tag);
}

describe("поля ввода", () => {
  it("каждое видимое поле берёт вид из ui/field.ts", () => {
    const offenders: string[] = [];

    for (const file of tsxFiles("src")) {
      const rel = relative(process.cwd(), file);
      if (ALLOWED.has(rel)) continue;

      const text = readFileSync(file, "utf8");
      const contract = contractNames(text);
      for (const name of ["input", "textarea", "select"]) {
        for (const tag of tags(text, name)) {
          if (isInvisible(tag)) continue;
          if (contract.test(tag)) continue;
          // Прозрачное поле внутри fieldWithin-обёртки: вид несёт обёртка, а
          // само поле обязано быть без фона, иначе перекроет её заливку.
          if (text.includes("fieldWithin") && /\bbg-transparent\b/.test(tag)) continue;
          offenders.push(`${rel}: <${name}> ${tag.replace(/\s+/g, " ").slice(0, 70)}`);
        }
      }
    }

    expect(offenders, [
      "Поле собрано вручную вместо field/fieldWithin из ui/field.ts —",
      "оно будет отличаться заливкой и кольцом фокуса от остальных.",
      "Есть причина не применять контракт — добавьте файл в ALLOWED с ней.",
    ].join(" ")).toEqual([]);
  });

  // field содержит focus-visible, который на неfocusable элементе не сработает
  // никогда. Обёртке нужен fieldWithin — иначе у поля просто нет кольца фокуса.
  it("обёртки берут fieldWithin, а не field", () => {
    const offenders: string[] = [];

    for (const file of tsxFiles("src")) {
      const text = readFileSync(file, "utf8");
      for (const name of ["div", "form", "label"]) {
        for (const tag of tags(text, name)) {
          if (/\$\{field\}/.test(tag)) {
            offenders.push(`${relative(process.cwd(), file)}: <${name}> с \${field}`);
          }
        }
      }
    }

    expect(offenders, "На обёртке focus-visible не срабатывает — нужен fieldWithin")
      .toEqual([]);
  });

  // Исключение без причины через месяц не отличить от недосмотра.
  it("у каждого исключения записана причина", () => {
    for (const [file, reason] of ALLOWED) {
      expect(reason.length, file).toBeGreaterThan(10);
    }
  });
});

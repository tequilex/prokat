import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { validateTokensCss } from "../../scripts/check-theme";

const css = readFileSync(join(process.cwd(), "theme", "tokens.css"), "utf8");

function block(sel: string): string {
  const re = new RegExp(`${sel.replace(/[.\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "m");
  return css.match(re)?.[1] ?? "";
}

describe("theme tokens", () => {
  it("keeps all required tokens present (check-theme contract)", () => {
    expect(validateTokensCss(css).ok).toBe(true);
  });

  it("uses a green accent in both themes", () => {
    // primary/accent/ring share the green; assert hue by exact configured hex
    expect(block(":root")).toMatch(/--color-primary:\s*#34C759/i);
    expect(block(".dark")).toMatch(/--color-primary:\s*#30D158/i);
  });

  // Хедер стал сплошной панелью: он совпадает с карточкой, а не с холстом,
  // иначе панель сливается с фоном и залитое поле поиска в ней пропадает.
  it("keeps header equal to card", () => {
    expect(block(":root")).toMatch(/--color-header:\s*#FFFFFF/i);
    expect(block(".dark")).toMatch(/--color-header:\s*#242426/i);
  });
});

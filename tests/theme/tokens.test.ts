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
    expect(block(":root")).toMatch(/--color-primary:\s*#087A41/i);
    expect(block(".dark")).toMatch(/--color-primary:\s*#22C77E/i);
  });

  it("drops the pink header (header equals background)", () => {
    expect(block(":root")).toMatch(/--color-header:\s*#FFFFFF/i);
    expect(block(".dark")).toMatch(/--color-header:\s*#232324/i);
  });
});

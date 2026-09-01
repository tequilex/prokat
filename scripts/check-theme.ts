export const REQUIRED_TOKENS = [
  "--color-background",
  "--color-foreground",
  "--color-header",
  "--color-card",
  "--color-card-fg",
  "--color-primary",
  "--color-primary-fg",
  "--color-accent",
  "--color-accent-fg",
  "--color-muted",
  "--color-muted-fg",
  "--color-border",
  "--color-ring",
  "--color-danger",
  "--color-hover",
  "--color-selected",
  "--color-selected-fg",
  "--color-selected-border",
  "--radius-sm",
  "--radius-lg",
  "--radius-pill",
  "--font-display",
  "--font-text",
  "--font-mark",
  "--font-mono",
] as const;

// Именно объявление, а не подстрока: --color-selected является префиксом
// --color-selected-fg, и блок, где объявлен только -fg, проходил бы проверку.
// Заодно не засчитывается упоминание токена в комментарии.
function declares(block: string, token: string): boolean {
  return new RegExp(`${token.replace(/-/g, "\\-")}\\s*:`).test(block);
}

const COLOR_TOKENS = REQUIRED_TOKENS.filter(t => t.startsWith("--color-"));

export interface ValidationResult {
  ok: boolean;
  missing: string[];
}

export function validateTokensCss(css: string): ValidationResult {
  const rootBlock = extractBlock(css, ":root");
  const darkBlock = extractBlock(css, ".dark");
  const missing: string[] = [];
  for (const token of REQUIRED_TOKENS) {
    if (!declares(rootBlock, token)) missing.push(`:root → ${token}`);
  }
  for (const token of COLOR_TOKENS) {
    if (!declares(darkBlock, token)) missing.push(`.dark → ${token}`);
  }
  return { ok: missing.length === 0, missing };
}

function extractBlock(css: string, selector: string): string {
  const escaped = selector.replace(/[.\\]/g, "\\$&");
  const re = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "m");
  const m = css.match(re);
  return m ? m[1] : "";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const css = fs.readFileSync(path.join(process.cwd(), "theme", "tokens.css"), "utf8");
  const result = validateTokensCss(css);
  if (result.ok) {
    console.log("✓ theme/tokens.css: all required tokens present");
    process.exit(0);
  } else {
    console.error("✗ theme/tokens.css: missing tokens");
    result.missing.forEach(m => console.error("  - " + m));
    process.exit(1);
  }
}

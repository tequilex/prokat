import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

// Цвета лежат в --color-* как чистый hex (IDE подсвечивает превью).
// Альфу подмешиваем через color-mix — Tailwind подставит <alpha-value> в момент сборки.
const c = (name: string) =>
  `color-mix(in srgb, var(${name}) calc(<alpha-value> * 100%), transparent)`;

export default {
  content: ["./src/**/*.{ts,tsx}", "./theme/**/*.{ts,tsx}"],
  darkMode: ["class"],
  theme: {
    // Шкала скруглений заменена целиком, а не расширена: дефолтные ключи
    // Tailwind (md, xl, 2xl, 3xl) убраны намеренно, иначе случайный
    // rounded-2xl молча заводит в проект третий радиус. Живых значения два —
    // см. --radius-* в theme/tokens.css.
    borderRadius: {
      none: "0",
      sm: "var(--radius-sm)",
      lg: "var(--radius-lg)",
      pill: "var(--radius-pill)",
      // Круг: аватары, иконочные кружки, счётчики.
      full: "9999px",
    },
    extend: {
      colors: {
        background: c("--color-background"),
        foreground: c("--color-foreground"),
        header: c("--color-header"),
        primary: {
          DEFAULT:    c("--color-primary"),
          foreground: c("--color-primary-fg"),
        },
        accent: {
          DEFAULT:    c("--color-accent"),
          foreground: c("--color-accent-fg"),
        },
        card: {
          DEFAULT:    c("--color-card"),
          foreground: c("--color-card-fg"),
        },
        muted: {
          DEFAULT:    c("--color-muted"),
          foreground: c("--color-muted-fg"),
        },
        border: c("--color-border"),
        ring:   c("--color-ring"),
        destructive: c("--color-danger"),
      },
      fontFamily: {
        display: "var(--font-display)",
        sans: "var(--font-text)",
        // Знак и деньги.
        mark: "var(--font-mark)",
        // Служебные капсы.
        mono: "var(--font-mono)",
      },
      fontSize: {
        micro: "var(--text-micro)",
        "2xs": "var(--text-2xs)",
        xs:   "var(--text-xs)",
        sm:   "var(--text-sm)",
        base: "var(--text-base)",
        lg:   "var(--text-lg)",
        xl:   "var(--text-xl)",
        "2xl": "var(--text-2xl)",
        "3xl": "var(--text-3xl)",
      },
      lineHeight: {
        tight: "var(--leading-tight)",
        snug:  "var(--leading-snug)",
        body:  "var(--leading-body)",
      },
      letterSpacing: {
        display: "var(--tracking-display)",
        mark:    "var(--tracking-mark)",
        mono:    "var(--tracking-mono)",
      },
    },
  },
  plugins: [animate, typography],
} satisfies Config;

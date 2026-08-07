import { Manrope, Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";

export const fontDisplay = Manrope({
  subsets: ["cyrillic", "latin"],
  variable: "--font-display-var",
  display: "swap",
});

export const fontText = Inter({
  subsets: ["cyrillic", "latin"],
  variable: "--font-text-var",
  display: "swap",
});

/* Знак inrenta и деньги: цена, залог, итог брони. У Space Grotesk нет
 * кириллицы — семейство и рассчитано только на латиницу и цифры. */
export const fontMark = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-mark-var",
  display: "swap",
});

/* Служебные капсы 10–11 px: подписи полей, статусы, метки. */
export const fontMono = JetBrains_Mono({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500"],
  variable: "--font-mono-var",
  display: "swap",
});

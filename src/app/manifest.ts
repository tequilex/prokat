import type { MetadataRoute } from "next";
import { content } from "@theme/content";
import { seo } from "@theme/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: content.site.name,
    short_name: content.site.shortName ?? content.site.name,
    description: content.site.description,
    start_url: "/",
    display: "standalone",
    // Цвет splash-экрана установленного PWA до первой отрисовки. Тёмный, а не
    // белый: тема по умолчанию тёмная (ThemeProvider в layout.tsx), и белая
    // вспышка перед тёмной страницей била по глазам. Значение манифеста
    // статично, поэтому выбравший светлую тему увидит короткую тёмную вспышку
    // — это цена, а не недосмотр.
    background_color: "#171719",
    theme_color: seo.themeColor,
    // Две записи вместо одной с purpose "any maskable": совмещённая строка
    // заставила бы Android показывать знак с 20% полей и там, где обрезки нет
    // — в списке приложений и на витрине установки.
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

export const seo = {
  siteName: "inrenta",
  defaultTitle: "inrenta — аренда вещей у людей рядом",
  defaultDescription:
    "Аренда вещей между людьми: инструмент, спорт, туризм, платья, фототехника. Найдите вещь в своём городе и оставьте заявку на бронь.",
  // Дубль --color-background из блока .dark в theme/tokens.css: в <meta> и в
  // манифест CSS-переменную не подставить. Расхождение ловит тест
  // tests/app/icons.test.ts, иначе смена палитры увела бы цвет молча.
  themeColor: "#171719",
  locale: "ru_RU",
  ogDefault: "/og-default.png",
} as const;

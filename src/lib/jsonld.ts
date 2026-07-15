// Конструкторы schema.org объектов для встраивания через
// <script type="application/ld+json"> на публичных страницах.
// Билдеры каталога (Product, LocalBusiness, BreadcrumbList) появятся
// вместе с публичным каталогом.

export interface JsonLd {
  "@context": "https://schema.org";
  "@type": string;
  // Индекс намеренно `any`: schema.org-объекты имеют разную форму,
  // а потребители ходят по полям напрямую.
  [k: string]: any;
}

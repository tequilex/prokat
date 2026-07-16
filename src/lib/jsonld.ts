// Конструкторы schema.org объектов для встраивания через
// <script type="application/ld+json"> на публичных страницах каталога.
// Возвращают plain objects; сериализует вызывающий (components/seo/JsonLd).

export interface JsonLd {
  "@context": "https://schema.org";
  "@type": string;
  // Индекс намеренно `any`: schema.org-объекты имеют разную форму,
  // а потребители/тесты ходят по полям напрямую.
  [k: string]: any;
}

const stripSlash = (s: string) => s.replace(/\/$/, "");

export function buildProductJsonLd(input: {
  title: string;
  description: string | null;
  priceDay: number | null;
  photoUrls: string[];
  url: string;            // абсолютный URL карточки позиции
  providerName: string;
  available: boolean;     // есть ли свободные единицы в ближайшую неделю
}): JsonLd {
  const ld: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.title,
    url: input.url,
  };
  if (input.description) ld.description = input.description;
  if (input.photoUrls.length > 0) ld.image = input.photoUrls;
  if (input.priceDay !== null) {
    ld.offers = {
      "@type": "Offer",
      price: input.priceDay,
      priceCurrency: "RUB",
      // Аренда посуточная: цена за день, бизнес-модель LeaseOut.
      businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
      availability: input.available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: input.url,
      seller: { "@type": "Organization", name: input.providerName },
    };
  }
  return ld;
}

export function buildLocalBusinessJsonLd(input: {
  name: string;
  description: string | null;
  url: string;            // абсолютный URL карточки проката
  cityName: string;
  address: string | null;
  lat: number | null;
  lon: number | null;
  phones: string[];
}): JsonLd {
  const ld: JsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: input.name,
    url: input.url,
    address: {
      "@type": "PostalAddress",
      addressLocality: input.cityName,
      ...(input.address ? { streetAddress: input.address } : {}),
    },
  };
  if (input.description) ld.description = input.description;
  if (input.phones.length > 0) ld.telephone = input.phones[0];
  if (input.lat !== null && input.lon !== null) {
    ld.geo = { "@type": "GeoCoordinates", latitude: input.lat, longitude: input.lon };
  }
  return ld;
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; url?: string }>,
  siteUrl: string,
): JsonLd {
  const base = stripSlash(siteUrl);
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      ...(it.url ? { item: `${base}${it.url}` } : {}),
    })),
  };
}

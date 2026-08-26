import { describe, it, expect } from "vitest";
import { serializeJsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbJsonLd, buildProductJsonLd } from "@/lib/jsonld";

// Регрессия на stored XSS: пользовательские строки, попадая в ld+json через
// <script>, не должны давать «живой» </script>. См. src/components/seo/JsonLd.tsx.
const PAYLOAD = "</script><script>alert(document.domain)</script>";

describe("serializeJsonLd() — экранирование для вставки в <script>", () => {
  it("обезвреживает </script> в названии, описании и имени продавца", () => {
    const out = serializeJsonLd(buildProductJsonLd({
      title: PAYLOAD,
      description: PAYLOAD,
      priceDay: 500,
      photoUrls: [],
      url: "https://inrenta.example/x",
      sellerName: PAYLOAD,
      available: true,
    }));
    expect(out.toLowerCase()).not.toContain("</script");
    expect(out.toLowerCase()).not.toContain("<script");
    expect(out).not.toContain("<");
    expect(out).toContain("\\u003c/script");
  });

  it("обезвреживает </script> в хлебных крошках", () => {
    const out = serializeJsonLd(buildBreadcrumbJsonLd(
      [{ name: PAYLOAD, url: "/x" }],
      "https://inrenta.example",
    ));
    expect(out).not.toContain("<");
  });

  it("не искажает данные: JSON.parse возвращает исходные строки", () => {
    const out = serializeJsonLd(buildProductJsonLd({
      title: PAYLOAD,
      description: "Обычное описание",
      priceDay: 500,
      photoUrls: [],
      url: "https://inrenta.example/x",
      sellerName: "Аня",
      available: false,
    }));
    const parsed = JSON.parse(out);
    expect(parsed.name).toBe(PAYLOAD);
    expect(parsed.offers.seller.name).toBe("Аня");
  });
  it("экранирует разделители строк U+2028/U+2029", () => {
    const sep = String.fromCharCode(0x2028) + String.fromCharCode(0x2029);
    const out = serializeJsonLd(buildProductJsonLd({
      title: `Дрель${sep}`,
      description: null,
      priceDay: 500,
      photoUrls: [],
      url: "https://inrenta.example/x",
      sellerName: "Аня",
      available: true,
    }));
    expect(out).toContain("\\u2028");
    expect(out).toContain("\\u2029");
    expect(out).not.toContain(sep);
    expect(JSON.parse(out).name).toBe(`Дрель${sep}`);
  });
});

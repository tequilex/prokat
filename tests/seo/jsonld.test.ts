import { describe, it, expect } from "vitest";
import { buildBreadcrumbJsonLd, buildProductJsonLd } from "@/lib/jsonld";

describe("buildProductJsonLd()", () => {
  const base = {
    title: "Перфоратор Bosch",
    description: "Мощный перфоратор.",
    priceDay: 500,
    photoUrls: ["https://img.example/1.webp"],
    url: "https://inrenta.example/kazan/elektroinstrument/perforator-01ARZ3NDEKTSV4RRFFQ69G5FAV",
    sellerName: "Артём",
    available: true,
  };

  it("собирает Product с Offer в рублях и LeaseOut", () => {
    const ld = buildProductJsonLd(base);
    expect(ld["@type"]).toBe("Product");
    expect(ld.name).toBe("Перфоратор Bosch");
    expect(ld.offers.price).toBe(500);
    expect(ld.offers.priceCurrency).toBe("RUB");
    expect(ld.offers.businessFunction).toContain("LeaseOut");
    expect(ld.offers.availability).toBe("https://schema.org/InStock");
    expect(ld.offers.seller.name).toBe("Артём");
  });

  it("без цены за сутки — без offers", () => {
    const ld = buildProductJsonLd({ ...base, priceDay: null });
    expect(ld.offers).toBeUndefined();
  });

  it("занятая позиция — OutOfStock", () => {
    const ld = buildProductJsonLd({ ...base, available: false });
    expect(ld.offers.availability).toBe("https://schema.org/OutOfStock");
  });

  it("без фото и описания — нет пустых полей", () => {
    const ld = buildProductJsonLd({ ...base, photoUrls: [], description: null });
    expect(ld.image).toBeUndefined();
    expect(ld.description).toBeUndefined();
  });
});

describe("buildBreadcrumbJsonLd()", () => {
  it("нумерует позиции и абсолютизирует url", () => {
    const ld = buildBreadcrumbJsonLd(
      [
        { name: "Главная", url: "/" },
        { name: "Казань", url: "/kazan" },
        { name: "Перфоратор" },
      ],
      "https://inrenta.example/",
    );
    expect(ld.itemListElement).toHaveLength(3);
    expect(ld.itemListElement[0].position).toBe(1);
    expect(ld.itemListElement[1].item).toBe("https://inrenta.example/kazan");
    expect(ld.itemListElement[2].item).toBeUndefined();
  });
});

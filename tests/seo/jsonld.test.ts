import { describe, it, expect } from "vitest";
import {
  buildBreadcrumbJsonLd, buildLocalBusinessJsonLd, buildProductJsonLd,
} from "@/lib/jsonld";

describe("buildProductJsonLd()", () => {
  const base = {
    title: "Перфоратор Bosch",
    description: "Мощный перфоратор.",
    priceDay: 500,
    photoUrls: ["https://img.example/1.webp"],
    url: "https://prokat.example/kazan/prokatmaster/perforator",
    providerName: "ПрокатМастер",
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
    expect(ld.offers.seller.name).toBe("ПрокатМастер");
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

describe("buildLocalBusinessJsonLd()", () => {
  it("собирает LocalBusiness с адресом, телефоном и geo", () => {
    const ld = buildLocalBusinessJsonLd({
      name: "ПрокатМастер",
      description: "Прокат инструмента.",
      url: "https://prokat.example/kazan/prokatmaster",
      cityName: "Казань",
      address: "ул. Баумана, 10",
      lat: 55.79,
      lon: 49.1,
      phones: ["+7 900 111-22-33"],
    });
    expect(ld["@type"]).toBe("LocalBusiness");
    expect(ld.address.addressLocality).toBe("Казань");
    expect(ld.address.streetAddress).toBe("ул. Баумана, 10");
    expect(ld.telephone).toBe("+7 900 111-22-33");
    expect(ld.geo.latitude).toBe(55.79);
  });

  it("без координат/телефонов — нет geo/telephone", () => {
    const ld = buildLocalBusinessJsonLd({
      name: "X", description: null, url: "https://x", cityName: "Казань",
      address: null, lat: null, lon: null, phones: [],
    });
    expect(ld.geo).toBeUndefined();
    expect(ld.telephone).toBeUndefined();
    expect(ld.address.streetAddress).toBeUndefined();
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
      "https://prokat.example/",
    );
    expect(ld.itemListElement).toHaveLength(3);
    expect(ld.itemListElement[0].position).toBe(1);
    expect(ld.itemListElement[1].item).toBe("https://prokat.example/kazan");
    expect(ld.itemListElement[2].item).toBeUndefined();
  });
});

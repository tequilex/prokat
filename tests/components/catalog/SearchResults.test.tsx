import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Верхняя панель выдачи теперь рендерится всегда, а календарь в ней зовёт
// useRouter() уже на рендере — без мока jsdom падает на «app router».
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock("@/server/catalog", async (orig) => ({
  ...(await orig<typeof import("@/server/catalog")>()),
  searchListings: vi.fn(),
  getAvailabilityRows: vi.fn(),
  getAllCategories: vi.fn(),
  getSearchFacets: vi.fn(),
}));

import {
  searchListings, getAvailabilityRows, getAllCategories, getSearchFacets,
} from "@/server/catalog";
import { SearchResults } from "@/components/catalog/SearchResults";

const city = { id: "c1", slug: "kazan", name: "Казань" } as never;

function item(id: string, title: string) {
  return {
    listing: {
      id, ownerUserId: "u1", slug: `l-${id}`, title,
      quantity: 1, priceDay: 500,
      depositType: "money", depositAmount: 3000, location: "Центр",
      handoverPickup: true, handoverDelivery: false, photosJson: [],
    },
    ownerName: "Артём", ownerImage: null, ownerIsVerified: true,
    categorySlug: "elektroinstrumenty", cityName: "Казань",
  } as never;
}

const root = {
  id: "cat1", parentId: null, name: "Электроинструмент",
  slug: "elektroinstrumenty",
} as never;

// В setup.ts нет clearMocks, а мок модуля один на весь файл — значения задаём
// заново перед каждым тестом, иначе состояние течёт между ними.
beforeEach(() => {
  vi.mocked(searchListings).mockResolvedValue({ items: [], total: 0 });
  vi.mocked(getAvailabilityRows).mockResolvedValue([]);
  vi.mocked(getAllCategories).mockResolvedValue([]);
  vi.mocked(getSearchFacets).mockResolvedValue({
    countsByCategory: new Map(), minPriceDay: null, maxPriceDay: null,
  });
});

describe("SearchResults", () => {
  it("shows the city feed when there is no query", async () => {
    vi.mocked(searchListings).mockResolvedValue({
      items: [item("1", "Перфоратор Bosch")], total: 1,
    });

    render(await SearchResults({ city, q: "", searchParams: {} }));

    expect(screen.getByText("Перфоратор Bosch")).toBeInTheDocument();
    expect(screen.queryByText(/Введите запрос/)).not.toBeInTheDocument();
  });

  it("asks the database for the whole city when there is no query", async () => {
    await SearchResults({ city, q: "", searchParams: {} });

    expect(searchListings).toHaveBeenCalledWith("c1", "", expect.anything(), undefined);
  });

  // Панель — единственный способ снять фильтр дат, поэтому она обязана быть на
  // месте и тогда, когда выдача пуста.
  it("keeps dates, sorting and view controls on an empty result", async () => {
    render(await SearchResults({
      city, q: "", searchParams: { from: "2026-09-10", to: "2026-09-12" },
    }));

    expect(screen.getByText("10 сен — 12 сен")).toBeInTheDocument();
  });

  it("shows section facets in the sidebar without a query", async () => {
    vi.mocked(getAllCategories).mockResolvedValue([root]);
    vi.mocked(getSearchFacets).mockResolvedValue({
      countsByCategory: new Map([["cat1", 7]]),
      minPriceDay: null, maxPriceDay: null,
    });

    render(await SearchResults({ city, q: "", searchParams: {} }));

    expect(screen.getByText("Электроинструмент")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("blames the query when a search yields nothing", async () => {
    render(await SearchResults({ city, q: "дрель", searchParams: { q: "дрель" } }));

    expect(screen.getByText(/Ничего не найдено по запросу/)).toBeInTheDocument();
  });

  it("blames the filters when they empty the feed", async () => {
    render(await SearchResults({ city, q: "", searchParams: { price_min: "100000" } }));

    expect(screen.getByText(/По этим условиям/)).toBeInTheDocument();
  });

  it("blames nobody when the city itself is empty", async () => {
    render(await SearchResults({ city, q: "", searchParams: {} }));

    expect(screen.getByText(/пока нечего арендовать/)).toBeInTheDocument();
  });
});

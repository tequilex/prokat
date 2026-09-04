import { describe, it, expect, vi, beforeEach } from "vitest";

// Единственное, что здесь проверяется, — что пустой запрос ДОХОДИТ до базы.
// Раньше searchListings и getSearchFacets на пустом q возвращали заглушку не
// заходя в getDb(), из-за чего /search без запроса была пустой страницей.
// Настоящий SQL так не проверить (БД-тестов в проекте нет), но именно этот
// ранний выход и был багом.
const select = vi.fn();

vi.mock("@/lib/db", () => {
  // Построитель запроса Drizzle — цепочка методов, оканчивающаяся await'ом.
  // Прокси отвечает на любое звено собой же и притворяется thenable, отдавая
  // пустой результат: содержимое выборки тут не важно, важен сам поход в базу.
  const chain: unknown = new Proxy({} as Record<string | symbol, unknown>, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (rows: unknown[]) => void) => resolve([]);
      }
      return (...args: unknown[]) => {
        if (prop === "select") select(...args);
        return chain;
      };
    },
  });
  return { getDb: () => chain, getPool: () => ({}) };
});

import { searchListings, getSearchFacets } from "@/server/catalog";

beforeEach(() => {
  select.mockClear();
});

describe("searchListings", () => {
  it("queries the database when the query is empty", async () => {
    const res = await searchListings("01ARZ3NDEKTSV4RRFFQ69G5FAV", "");
    expect(select).toHaveBeenCalled();
    expect(res).toEqual({ items: [], total: 0 });
  });

  it("queries the database when there is a query", async () => {
    await searchListings("01ARZ3NDEKTSV4RRFFQ69G5FAV", "дрель");
    expect(select).toHaveBeenCalled();
  });
});

describe("getSearchFacets", () => {
  it("queries the database when the query is empty", async () => {
    await getSearchFacets("01ARZ3NDEKTSV4RRFFQ69G5FAV", "");
    expect(select).toHaveBeenCalled();
  });

  // Границы слайдера не должны учитывать сам ценовой фильтр, иначе диапазон
  // схлопывается к выбранному. Считаются они отдельным запросом — и только
  // тогда, когда фильтр цены действительно стоит.
  it("takes bounds from the counting query while no price filter is set", async () => {
    await getSearchFacets("01ARZ3NDEKTSV4RRFFQ69G5FAV", "", { deposit: "money" });
    expect(select).toHaveBeenCalledTimes(1);
  });

  it("counts bounds separately once a price filter narrows the feed", async () => {
    await getSearchFacets("01ARZ3NDEKTSV4RRFFQ69G5FAV", "", { priceMin: 100 });
    expect(select).toHaveBeenCalledTimes(2);
  });
});

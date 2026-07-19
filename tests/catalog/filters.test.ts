import { describe, it, expect } from "vitest";
import { parseFilters } from "@/lib/catalog/filters";

describe("parseFilters()", () => {
  it("пустые параметры — без фильтров, страница 1", () => {
    expect(parseFilters({})).toEqual({
      priceMin: undefined, priceMax: undefined, sort: undefined, page: 1,
    });
  });

  it("пустые строки из незаполненной формы — НЕ ноль", () => {
    // Браузер шлёт ?price_min=&price_max=&sort=new при пустых полях.
    const f = parseFilters({ price_min: "", price_max: "", sort: "new" });
    expect(f.priceMin).toBeUndefined();
    expect(f.priceMax).toBeUndefined();
    expect(f.sort).toBeUndefined();
  });

  it("валидные числа проходят, дробные floor-ятся", () => {
    const f = parseFilters({ price_min: "400", price_max: "700.9" });
    expect(f.priceMin).toBe(400);
    expect(f.priceMax).toBe(700);
  });

  it("мусор и отрицательные — игнорируются", () => {
    const f = parseFilters({ price_min: "abc", price_max: "-5", page: "xx" });
    expect(f.priceMin).toBeUndefined();
    expect(f.priceMax).toBeUndefined();
    expect(f.page).toBe(1);
  });

  it("sort только из белого списка", () => {
    expect(parseFilters({ sort: "price_asc" }).sort).toBe("price_asc");
    expect(parseFilters({ sort: "price_desc" }).sort).toBe("price_desc");
    expect(parseFilters({ sort: "evil" }).sort).toBeUndefined();
  });

  it("page парсится, невалидная — 1", () => {
    expect(parseFilters({ page: "3" }).page).toBe(3);
    expect(parseFilters({ page: "0" }).page).toBe(1);
    expect(parseFilters({ page: "" }).page).toBe(1);
  });
});

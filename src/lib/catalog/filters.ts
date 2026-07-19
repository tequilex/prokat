// Разбор GET-параметров фильтров листинга. Отдельно от компонента,
// чтобы тестировать без рендера.

import type { ListingFilters } from "@/server/catalog";

export interface CategorySearchParams {
  price_min?: string;
  price_max?: string;
  sort?: string;
  page?: string;
  q?: string;
  city?: string;
}

// Поисковый запрос из GET-параметров. Отдельно от parseFilters, т.к. категорийные
// страницы его не используют, а /search — да.
export function parseQuery(sp: { q?: string }): string {
  return (sp.q ?? "").trim();
}

// NB: пустая строка — НЕ ноль. Браузер отправляет незаполненные поля формы
// как `price_max=`, а Number("") === 0 превращал бы это в фильтр «до 0 ₽».
function num(s: string | undefined): number | undefined {
  if (s === undefined || s.trim() === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
}

export function parseFilters(sp: CategorySearchParams): ListingFilters {
  const sort = sp.sort === "price_asc" || sp.sort === "price_desc" ? sp.sort : undefined;
  const page = num(sp.page);
  return {
    priceMin: num(sp.price_min),
    priceMax: num(sp.price_max),
    sort,
    page: page && page > 0 ? page : 1,
  };
}

// Результаты поиска: тот же вид, что у категории (фильтры + сетка карточек +
// пагинация), но источник — searchListings по городу. Server component.

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  getAvailabilityRows, searchListings, DEFAULT_PAGE_SIZE, type City,
} from "@/server/catalog";
import { parseFilters, type CategorySearchParams } from "@/lib/catalog/filters";
import { todayStr, addDaysStr } from "@/lib/catalog/dates";
import { buildAvailabilityByListing } from "@/lib/catalog/availability";
import { ListingCard } from "@/components/catalog/ListingCard";
import { ListingFilters, type FilterState } from "@/components/catalog/ListingFilters";

export async function SearchResults({
  city, q, searchParams,
}: {
  city: City;
  q: string;
  searchParams: CategorySearchParams;
}) {
  const filters = parseFilters(searchParams);
  const { items, total } = await searchListings(city.id, q, filters);

  const from = todayStr();
  const to = addDaysStr(from, 6);
  const availRows = await getAvailabilityRows(items.map((i) => i.listing.id), from, to);
  const availByListing = buildAvailabilityByListing(availRows);

  const filterState: FilterState = {
    priceMin: filters.priceMin, priceMax: filters.priceMax, sort: filters.sort,
  };

  const page = filters.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE));
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("city", city.slug);
    if (searchParams.price_min) params.set("price_min", searchParams.price_min);
    if (searchParams.price_max) params.set("price_max", searchParams.price_max);
    if (searchParams.sort) params.set("sort", searchParams.sort);
    if (p > 1) params.set("page", String(p));
    return `/search?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-5 md:flex-row">
      <aside className="md:w-56 md:shrink-0">
        <ListingFilters
          basePath="/search"
          state={filterState}
          subcategories={[]}
          categoryBasePath="/search"
          hidden={{ q, city: city.slug }}
        />
      </aside>

      <div className="flex-1">
        {q === "" ? (
          <EmptyState>Введите запрос в строке поиска, чтобы найти вещи в аренду.</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState>Ничего не найдено по запросу «{q}».</EmptyState>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <ListingCard
                  key={item.listing.id}
                  item={item}
                  citySlug={city.slug}
                  availabilityMap={availByListing.get(item.listing.id) ?? new Map()}
                  from={from}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <nav aria-label="Пагинация" className="mt-6 flex items-center justify-center gap-3 text-sm">
                {page > 1 && (
                  <Link href={pageHref(page - 1) as never} className="rounded-sm border border-border px-3 py-1.5 hover:bg-muted">
                    ← Назад
                  </Link>
                )}
                <span className="text-muted-foreground">Страница {page} из {totalPages}</span>
                {page < totalPages && (
                  <Link href={pageHref(page + 1) as never} className="rounded-sm border border-border px-3 py-1.5 hover:bg-muted">
                    Вперёд →
                  </Link>
                )}
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}

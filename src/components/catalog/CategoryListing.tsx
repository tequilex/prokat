// Общий вид листинга категории/подкатегории: вводный блок из данных,
// чипы подкатегорий, фильтры, сетка карточек, пагинация. Server component.

import Link from "next/link";
import {
  getAvailabilityRows, getCategoryStats, getListingsForCategories,
  DEFAULT_PAGE_SIZE,
  type Category, type City,
} from "@/server/catalog";
import { parseFilters, type CategorySearchParams } from "@/lib/catalog/filters";
import { todayStr, addDaysStr } from "@/lib/catalog/dates";
import { formatPrice, listingsCountLabel, ownersCountLabel } from "@/lib/catalog/format";
import { buildAvailabilityByListing } from "@/lib/catalog/availability";
import { ListingCard } from "@/components/catalog/ListingCard";
import { ListingFilters, type FilterState } from "@/components/catalog/ListingFilters";

export type { CategorySearchParams } from "@/lib/catalog/filters";

export async function CategoryListing({
  city, categoryIds, basePath, categoryBasePath, subcategories, activeSubSlug, searchParams,
}: {
  city: City;
  categoryIds: string[];
  basePath: string;          // текущая страница (для формы фильтров и пагинации)
  categoryBasePath: string;  // /{city}/{rootCategory} — база для чипов подкатегорий
  subcategories: Array<Category & { count: number }>;
  activeSubSlug?: string;
  searchParams: CategorySearchParams;
}) {
  const filters = parseFilters(searchParams);
  const [{ items, total }, stats] = await Promise.all([
    getListingsForCategories(city.id, categoryIds, filters),
    getCategoryStats(city.id, categoryIds),
  ]);

  // Занятость всех карточек страницы на неделю — одним запросом.
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
    const q = new URLSearchParams();
    if (searchParams.price_min) q.set("price_min", searchParams.price_min);
    if (searchParams.price_max) q.set("price_max", searchParams.price_max);
    if (searchParams.sort) q.set("sort", searchParams.sort);
    if (p > 1) q.set("page", String(p));
    const qs = q.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Вводный блок — только из данных */}
      {stats.listingCount > 0 && (
        <p className="text-sm text-muted-foreground">
          {listingsCountLabel(stats.listingCount)} от {ownersCountLabel(stats.ownerCount)}
          {stats.minPriceDay !== null && (
            <>
              , цены от {formatPrice(stats.minPriceDay)}
              {stats.maxPriceDay !== null && stats.maxPriceDay !== stats.minPriceDay && (
                <> до {formatPrice(stats.maxPriceDay)}</>
              )} за сутки
            </>
          )}
          {stats.avgDeposit !== null && <>, средний залог {formatPrice(stats.avgDeposit)}</>}.
        </p>
      )}

      <div className="flex flex-col gap-5 md:flex-row">
        <aside className="md:sticky md:top-20 md:h-fit md:w-56 md:shrink-0 md:self-start">
          <ListingFilters
            basePath={basePath}
            state={filterState}
            subcategories={subcategories}
            categoryBasePath={categoryBasePath}
            activeSubSlug={activeSubSlug}
          />
        </aside>

        <div className="flex-1">
          {items.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              По этим условиям позиций не нашлось.
            </p>
          ) : (
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
          )}

          {totalPages > 1 && (
            <nav aria-label="Пагинация" className="mt-6 flex items-center justify-center gap-3 text-sm">
              {page > 1 && (
                <Link href={pageHref(page - 1) as never} className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
                  ← Назад
                </Link>
              )}
              <span className="text-muted-foreground">Страница {page} из {totalPages}</span>
              {page < totalPages && (
                <Link href={pageHref(page + 1) as never} className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
                  Вперёд →
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

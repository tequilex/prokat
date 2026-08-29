// Результаты поиска: тот же вид, что у категории (фильтры + сетка карточек +
// пагинация), но источник — searchListings по городу. Server component.

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  getAllCategories, getAvailabilityRows, getSearchFacets, rollupToRoots,
  searchListings, DEFAULT_PAGE_SIZE, type City,
} from "@/server/catalog";
import {
  filterParams, parseFilters, SORT_OPTIONS, type CategorySearchParams,
} from "@/lib/catalog/filters";
import { todayStr, addDaysStr } from "@/lib/catalog/dates";
import { buildAvailabilityByListing } from "@/lib/catalog/availability";
import { ListingCard } from "@/components/catalog/ListingCard";
import { ListingFilters, type FilterState } from "@/components/catalog/ListingFilters";
import { SortMenu } from "@/components/catalog/SortMenu";
import { CategoryFacets } from "@/components/catalog/CategoryFacets";
import { DateRangeFilter } from "@/components/catalog/DateRangeFilter";
import { ViewToggle, parseView } from "@/components/catalog/ViewToggle";

export async function SearchResults({
  city, q, searchParams,
}: {
  city: City;
  q: string;
  searchParams: CategorySearchParams;
}) {
  const filters = parseFilters(searchParams);
  // Пустой запрос — страница показывает подсказку, разделы и фасеты не нужны.
  const cats = q.trim() === "" ? [] : await getAllCategories();

  // Сужение по разделу: слаг из адреса → корень и все его подкатегории. Раздела
  // нет или слаг чужой — сужения нет, ищем по всему городу.
  const activeRoot = searchParams.category
    ? cats.find((c) => c.slug === searchParams.category && c.parentId === null)
    : undefined;
  const narrowIds = activeRoot
    ? [activeRoot.id, ...cats.filter((c) => c.parentId === activeRoot.id).map((c) => c.id)]
    : undefined;

  const [{ items, total }, facets] = await Promise.all([
    searchListings(city.id, q, filters, narrowIds),
    getSearchFacets(city.id, q, filters),
  ]);

  const from = todayStr();
  const to = addDaysStr(from, 6);
  const availRows = await getAvailabilityRows(items.map((i) => i.listing.id), from, to);
  const availByListing = buildAvailabilityByListing(availRows);

  // Границы слайдера — по результатам запроса, а не по всему городу: иначе
  // ручки стояли бы на ценах, которых в выдаче нет.
  const priceBounds =
    facets.minPriceDay !== null && facets.maxPriceDay !== null
      && facets.maxPriceDay > facets.minPriceDay
      ? { min: facets.minPriceDay, max: facets.maxPriceDay }
      : undefined;

  // Счётчики разделов — роллап прямых счётчиков на корни, как в дереве каталога.
  const rootCounts = rollupToRoots(cats, facets.countsByCategory);
  const view = parseView(searchParams.view);
  const searchHref = (params: URLSearchParams) => {
    if (q) params.set("q", q);
    params.set("city", city.slug);
    return `/search?${params.toString()}`;
  };
  const categoryFacets = cats
    .filter((c) => c.parentId === null && (rootCounts.get(c.id) ?? 0) > 0)
    .map((c) => {
      const params = filterParams(searchParams);
      params.set("category", c.slug);
      return { slug: c.slug, name: c.name, count: rootCounts.get(c.id) ?? 0, href: searchHref(params) };
    });
  const allCategoriesHref = (() => {
    const params = filterParams(searchParams);
    params.delete("category");
    return searchHref(params);
  })();

  const withParams = (mutate: (q: URLSearchParams) => void) => {
    const q = filterParams(searchParams);
    mutate(q);
    return searchHref(q);
  };
  const datesResetHref = withParams((q) => { q.delete("from"); q.delete("to"); });
  const gridHref = withParams((q) => q.delete("view"));
  const listHref = withParams((q) => q.set("view", "list"));

  const filterState: FilterState = {
    priceMin: filters.priceMin, priceMax: filters.priceMax,
    deposit: filters.deposit, verifiedOnly: filters.verifiedOnly, sort: filters.sort,
  };

  const page = filters.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE));
  const sortOptions = SORT_OPTIONS.map((o) => {
    const params = filterParams(searchParams);
    if (q) params.set("q", q);
    params.set("city", city.slug);
    if (o.value === "new") params.delete("sort"); else params.set("sort", o.value);
    return { ...o, href: `/search?${params.toString()}` };
  });

  const pageHref = (p: number) => {
    const params = filterParams(searchParams);
    if (q) params.set("q", q);
    params.set("city", city.slug);
    if (p > 1) params.set("page", String(p));
    return `/search?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-5 md:flex-row">
      <aside className="md:sticky md:top-[calc(var(--header-total)+1rem)] md:h-fit md:w-64 md:shrink-0 md:self-start">
        <ListingFilters
          basePath="/search"
          state={filterState}
          priceBounds={priceBounds}
          hidden={{
            q,
            city: city.slug,
            category: searchParams.category ?? "",
            view: searchParams.view ?? "",
            from: searchParams.from ?? "",
            to: searchParams.to ?? "",
            sort: searchParams.sort ?? "",
          }}
          categoryLabel={activeRoot?.name ?? "Все разделы"}
          categoryNav={
            <CategoryFacets
              facets={categoryFacets}
              allHref={allCategoriesHref}
              activeSlug={activeRoot?.slug}
            />
          }
        />
      </aside>

      <div className="flex flex-1 flex-col gap-4">
        {q !== "" && items.length > 0 && (
          <div className="surface flex items-center justify-between gap-2 p-1.5">
            <DateRangeFilter
              from={searchParams.from}
              to={searchParams.to}
              resetHref={datesResetHref}
              today={from}
            />
            <div className="flex items-center gap-2">
              <SortMenu options={sortOptions} current={searchParams.sort} />
              <ViewToggle view={view} gridHref={gridHref} listHref={listHref} />
            </div>
          </div>
        )}
        {q === "" ? (
          <EmptyState>Введите запрос в строке поиска, чтобы найти вещи в аренду.</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState>Ничего не найдено по запросу «{q}».</EmptyState>
        ) : (
          <>
            <div className={view === "list"
              ? "flex flex-col gap-3"
              : "grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3"}>
              {items.map((item) => (
                <ListingCard
                  key={item.listing.id}
                  item={item}
                  citySlug={city.slug}
                  availabilityMap={availByListing.get(item.listing.id) ?? new Map()}
                  from={from}
                  view={view}
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

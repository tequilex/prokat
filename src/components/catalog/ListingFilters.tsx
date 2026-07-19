// Фильтры листинга. Обычная GET-форма без клиентского JS: SSR перечитывает
// searchParams. На мобиле форма прячется в bottom-sheet (FiltersSheet).

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FiltersSheet } from "@/components/catalog/FiltersSheet";
import type { Category } from "@/server/catalog";

export interface FilterState {
  priceMin?: number;
  priceMax?: number;
  sort?: string;
}

function FormInner({
  basePath, state, hidden,
}: {
  basePath: string;
  state: FilterState;
  hidden?: Record<string, string>;
}) {
  const hiddenEntries = Object.entries(hidden ?? {}).filter(([, v]) => v !== "");
  // «Сбросить» очищает фильтры, но сохраняет контекст поиска (q, city).
  const resetQs = new URLSearchParams(hiddenEntries).toString();
  const resetHref = resetQs ? `${basePath}?${resetQs}` : basePath;

  return (
    <form method="GET" action={basePath} className="flex flex-col gap-3">
      {hiddenEntries.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <fieldset className="flex items-center gap-2">
        <legend className="mb-1 text-xs font-medium text-muted-foreground">Цена за сутки, ₽</legend>
        <input
          type="number" name="price_min" min={0} placeholder="от"
          defaultValue={state.priceMin ?? ""}
          className="h-9 w-24 rounded-md border border-border bg-background px-2 text-sm"
        />
        <span className="text-muted-foreground">—</span>
        <input
          type="number" name="price_max" min={0} placeholder="до"
          defaultValue={state.priceMax ?? ""}
          className="h-9 w-24 rounded-md border border-border bg-background px-2 text-sm"
        />
      </fieldset>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Сортировка
        <select
          name="sort" defaultValue={state.sort ?? "new"}
          className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
        >
          <option value="new">Сначала новые</option>
          <option value="price_asc">Дешевле</option>
          <option value="price_desc">Дороже</option>
        </select>
      </label>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm">Показать</Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={resetHref as never}>Сбросить</Link>
        </Button>
      </div>
    </form>
  );
}

export function ListingFilters({
  basePath, state, subcategories, categoryBasePath, activeSubSlug, hidden,
}: {
  basePath: string;
  state: FilterState;
  subcategories: Array<Category & { count: number }>;
  // Путь корневой категории: /{city}/{category}. Чипы подкатегорий строятся от него.
  categoryBasePath: string;
  activeSubSlug?: string;
  // Доп. GET-параметры (q, city), которые надо сохранить при сабмите формы.
  hidden?: Record<string, string>;
}) {
  return (
    <div className="flex flex-col gap-4">
      {subcategories.length > 0 && (
        <nav aria-label="Подкатегории" className="flex flex-wrap gap-2">
          {subcategories.map((s) => (
            <Link
              key={s.id}
              href={`${categoryBasePath}/${s.slug}` as never}
              className={`rounded-pill border px-3 py-1.5 text-sm ${
                s.slug === activeSubSlug
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.name} <span className="text-muted-foreground">{s.count}</span>
            </Link>
          ))}
        </nav>
      )}

      {/* Mobile: форма прячется в bottom-sheet; desktop: инлайн. */}
      <div className="md:hidden">
        <FiltersSheet>
          <FormInner basePath={basePath} state={state} hidden={hidden} />
        </FiltersSheet>
      </div>
      <div className="hidden md:block">
        <FormInner basePath={basePath} state={state} hidden={hidden} />
      </div>
    </div>
  );
}

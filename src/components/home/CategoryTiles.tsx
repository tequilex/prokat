import type { CSSProperties } from "react";
import Link from "next/link";
import { content } from "@theme/content";
import { verticalIcon } from "./categoryIcon";

export interface CategoryTile {
  slug: string;
  name: string;
  vertical: string | null;
  count?: number;
}

// Категории во всю ширину: карточки разной ширины (flex-basis по длине названия),
// растягиваются и заполняют строку целиком. Название слева-сверху, иконка справа-снизу.
export function CategoryTiles({
  citySlug,
  categories,
}: {
  citySlug: string;
  categories: CategoryTile[];
}) {
  if (categories.length === 0) return null;
  return (
    <section aria-label={content.home.categoriesHeading} className="w-full pt-8 pb-2">
      <div className="mb-5 flex items-baseline justify-between gap-3 px-4 sm:px-6 lg:px-12">
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">
          {content.home.categoriesHeading}
        </h2>
        <Link
          href={`/${citySlug}` as never}
          className="shrink-0 text-sm font-semibold text-primary hover:underline"
        >
          Смотреть все →
        </Link>
      </div>
      <div className="flex flex-wrap gap-3 px-4 sm:px-6 lg:px-12">
        {categories.map((c) => {
          const Icon = verticalIcon(c.vertical);
          return (
            <Link
              key={c.slug}
              href={`/${citySlug}/${c.slug}` as never}
              style={{ "--len": c.name.length } as CSSProperties}
              className="relative flex min-h-[72px] min-w-[96px] grow basis-[calc(66px_+_var(--len)*4px)] overflow-hidden rounded-2xl bg-card p-3 transition-transform hover:-translate-y-0.5 active:scale-[0.99] sm:min-h-[96px] sm:min-w-[140px] sm:basis-[calc(104px_+_var(--len)*7px)] sm:rounded-[20px] sm:p-4"
            >
              <span className="pr-8 text-[13px] font-semibold leading-tight text-foreground sm:pr-10 sm:text-sm">
                {c.name}
              </span>
              <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-primary sm:bottom-3 sm:right-3 sm:h-10 sm:w-10 sm:rounded-xl">
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

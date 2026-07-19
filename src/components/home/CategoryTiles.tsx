import Link from "next/link";
import { listingsCountLabel } from "@/lib/catalog/format";
import { verticalIcon } from "./categoryIcon";

export interface CategoryTile {
  slug: string;
  name: string;
  vertical: string | null;
  count?: number;
}

export function CategoryTiles({
  citySlug,
  categories,
}: {
  citySlug: string;
  categories: CategoryTile[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {categories.map((c) => {
        const Icon = verticalIcon(c.vertical);
        return (
          <Link
            key={c.slug}
            href={`/${citySlug}/${c.slug}` as never}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-transform hover:border-primary active:scale-[0.97]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-primary">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium text-foreground">{c.name}</span>
            {c.count !== undefined && (
              <span className="text-xs text-muted-foreground">{listingsCountLabel(c.count)}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

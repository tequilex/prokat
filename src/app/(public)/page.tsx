import Link from "next/link";
import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { content } from "@theme/content";
import { seo } from "@theme/seo";
import {
  getActiveCities, getAllCategories, getListingCountsByCategory, rollupToRoots,
} from "@/server/catalog";
import { listingsCountLabel } from "@/lib/catalog/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: seo.defaultTitle,
  description: seo.defaultDescription,
};

export default async function HomePage() {
  const [citiesList, cats] = await Promise.all([getActiveCities(), getAllCategories()]);
  const roots = cats.filter((c) => c.parentId === null);

  // Пока город один — категории на главной ведут сразу в него.
  const onlyCity = citiesList.length === 1 ? citiesList[0] : null;
  const rootCounts = onlyCity
    ? rollupToRoots(cats, await getListingCountsByCategory(onlyCity.id))
    : null;

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-8">
      <section className="py-8 text-center md:py-14">
        <h1 className="font-display text-2xl font-bold md:text-3xl">{content.site.tagline}</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Найдите нужную вещь в своём городе и оставьте заявку на бронь —
          владелец проката свяжется с вами.
        </p>
      </section>

      <section aria-labelledby="cities-heading" className="mt-4">
        <h2 id="cities-heading" className="mb-3 text-lg font-semibold">Города</h2>
        <div className="flex flex-wrap gap-3">
          {citiesList.map((c) => (
            <Link
              key={c.id}
              href={`/${c.slug}` as never}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 hover:border-primary"
            >
              <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="font-medium">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {onlyCity && rootCounts && (
        <section aria-labelledby="cats-heading" className="mt-10">
          <h2 id="cats-heading" className="mb-3 text-lg font-semibold">Категории</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roots.map((cat) => (
              <Link
                key={cat.id}
                href={`/${onlyCity.slug}/${cat.slug}` as never}
                className="rounded-lg border border-border bg-card p-4 hover:border-primary"
              >
                <span className="font-medium">{cat.name}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {listingsCountLabel(rootCounts.get(cat.id) ?? 0)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

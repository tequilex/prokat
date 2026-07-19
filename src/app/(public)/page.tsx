import type { Metadata } from "next";
import { seo } from "@theme/seo";
import { content } from "@theme/content";
import { auth } from "@/lib/auth";
import {
  getActiveCities, getAllCategories, getListingCountsByCategory, rollupToRoots,
} from "@/server/catalog";
import { Hero } from "@/components/home/Hero";
import { CategoryTiles } from "@/components/home/CategoryTiles";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ListYourItemBand } from "@/components/home/ListYourItemBand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: seo.defaultTitle,
  description: seo.defaultDescription,
};

export default async function HomePage() {
  const [session, cities, cats] = await Promise.all([
    auth(),
    getActiveCities(),
    getAllCategories(),
  ]);

  // Категории завязаны на город (роуты /[city]/[seg]). Берём «город по умолчанию» —
  // единственный активный, иначе первый; переключение — через CitySelector в шапке.
  const defaultCity = cities[0] ?? null;
  const roots = cats.filter((c) => c.parentId === null);
  const counts = defaultCity
    ? rollupToRoots(cats, await getListingCountsByCategory(defaultCity.id))
    : null;

  const chips = roots.slice(0, 5).map((c) => ({ slug: c.slug, name: c.name }));
  const tiles = roots.map((c) => ({
    slug: c.slug,
    name: c.name,
    vertical: c.vertical,
    count: counts?.get(c.id),
  }));

  const user = session?.user;
  const placeHref = !user ? "/login" : user.username ? "/cabinet/listings/new" : "/welcome";

  return (
    <main>
      <Hero citySlug={defaultCity?.slug} chips={chips} />

      <div className="mx-auto w-full max-w-[1200px] space-y-12 px-4 py-12">
        {defaultCity && (
          <section>
            <h2 className="mb-5 text-xl font-semibold text-foreground">
              {content.home.categoriesHeading}
            </h2>
            <CategoryTiles citySlug={defaultCity.slug} categories={tiles} />
          </section>
        )}

        <HowItWorks />

        <ListYourItemBand href={placeHref} />
      </div>
    </main>
  );
}

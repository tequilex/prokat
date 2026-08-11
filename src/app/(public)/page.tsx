import type { Metadata } from "next";
import { seo } from "@theme/seo";
import { auth } from "@/lib/auth";
import { authPanelProps } from "@/lib/auth/panel-props";
import {
  getActiveCities, getAllCategories, getListingCountsByCategory, getRecentListings, rollupToRoots,
} from "@/server/catalog";
import { Hero } from "@/components/home/Hero";
import { RecentItems } from "@/components/home/RecentItems";
import { CategoryTiles } from "@/components/home/CategoryTiles";
import { WhyChoose } from "@/components/home/WhyChoose";
import { ListYourItemBand } from "@/components/home/ListYourItemBand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // absolute — иначе к заголовку применится шаблон `%s — inrenta` из корневого
  // layout и имя задвоится.
  title: { absolute: seo.defaultTitle },
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

  const recent = defaultCity ? await getRecentListings(defaultCity.id, 12) : [];
  const tiles = roots.map((c) => ({
    slug: c.slug,
    name: c.name,
    vertical: c.vertical,
    count: counts?.get(c.id),
  }));

  const user = session?.user;
  const placeHref = !user ? "/login" : user.username ? "/cabinet/listings/new" : "/welcome";

  // Анониму баннер «Разместить» открывает вход модалкой, а не уводит на /login.
  const authProps = authPanelProps();

  return (
    <main>
      <Hero
        citySlug={defaultCity?.slug}
        cityName={defaultCity?.name}
        categories={roots.map((c) => ({ slug: c.slug, name: c.name }))}
      />

      {defaultCity && <RecentItems items={recent} citySlug={defaultCity.slug} />}

      {defaultCity && <CategoryTiles citySlug={defaultCity.slug} categories={tiles} />}

      <div className="mx-auto w-full max-w-[1200px] space-y-10 px-4 pb-12 pt-6">
        <WhyChoose />

        <ListYourItemBand href={placeHref} authProps={user ? undefined : authProps} />
      </div>
    </main>
  );
}

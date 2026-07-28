// Хаб города: все активные товары города (фильтры, пагинация) + навигация по
// корневым категориям чипами.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { seo } from "@theme/seo";
import {
  getAllCategories, getCityBySlug, getListingCountsByCategory, rollupToRoots,
} from "@/server/catalog";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { CategoryListing, type CategorySearchParams } from "@/components/catalog/CategoryListing";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ city: string }>;
  searchParams: Promise<CategorySearchParams>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = await getCityBySlug(citySlug);
  if (!city) return {};
  return {
    title: seo.titleTemplate(`Аренда вещей в ${city.name}`),
    description: `Всё для аренды в ${city.name}: инструмент, техника, спорт, одежда и другое. Каталог с ценами и заявкой на бронь онлайн.`,
    alternates: { canonical: `${siteConfig.url}/${city.slug}` },
  };
}

export default async function CityPage({ params, searchParams }: Props) {
  const { city: citySlug } = await params;
  const city = await getCityBySlug(citySlug);
  if (!city) notFound();

  const [cats, direct] = await Promise.all([
    getAllCategories(),
    getListingCountsByCategory(city.id),
  ]);
  const rootCounts = rollupToRoots(cats, direct);
  // Корневые категории с товарами — как чипы навигации.
  const rootChips = cats
    .filter((c) => c.parentId === null)
    .map((c) => ({ ...c, count: rootCounts.get(c.id) ?? 0 }))
    .filter((c) => c.count > 0);
  const allCategoryIds = cats.map((c) => c.id);

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6">
      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: city.name }]} />
      <h1 className="mb-4 mt-3 font-display text-2xl font-bold">Всё для аренды в {city.name}</h1>
      <CategoryListing
        city={city}
        categoryIds={allCategoryIds}
        basePath={`/${city.slug}`}
        categoryBasePath={`/${city.slug}`}
        subcategories={rootChips}
        searchParams={await searchParams}
      />
    </main>
  );
}

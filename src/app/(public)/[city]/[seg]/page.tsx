// /{city}/{seg} — категория (слаг категории уникален глобально). Подкатегория по
// прямому слагу редиректится на канонический /{city}/{root}/{sub}. Карточка товара
// живёт на третьем сегменте (/{city}/{cat}/{slug}-{id}) — см. [sub]/page.tsx.
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { seo } from "@theme/seo";
import {
  getAllCategories, getCategoryBySlug, getCityBySlug, getListingCountsByCategory,
  type Category, type City,
} from "@/server/catalog";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { CategoryListing, type CategorySearchParams } from "@/components/catalog/CategoryListing";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbJsonLd } from "@/lib/jsonld";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ city: string; seg: string }>;
  searchParams: Promise<CategorySearchParams>;
}

async function resolve(citySlug: string, seg: string) {
  const city = await getCityBySlug(citySlug);
  if (!city) return null;
  const category = await getCategoryBySlug(seg);
  if (!category) return null;
  return { city, category };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug, seg } = await params;
  const r = await resolve(citySlug, seg);
  if (!r) return {};
  const cat = r.category;
  return {
    title: seo.titleTemplate(`Аренда: ${cat.name.toLowerCase()} в ${r.city.name}`),
    description: `${cat.name} напрокат в ${r.city.name}: каталог товаров с ценами, залогами и календарём занятости.`,
    alternates: { canonical: `${siteConfig.url}/${r.city.slug}/${seg}` },
  };
}

export default async function CitySegPage({ params, searchParams }: Props) {
  const { city: citySlug, seg } = await params;
  const r = await resolve(citySlug, seg);
  if (!r) notFound();
  const { city, category } = r;

  if (category.parentId !== null) {
    // Канонический адрес подкатегории — под корневой категорией.
    const cats = await getAllCategories();
    const root = cats.find((c) => c.id === category.parentId);
    if (root) permanentRedirect(`/${city.slug}/${root.slug}/${category.slug}`);
    notFound();
  }

  return <RootCategoryPage city={city} category={category} searchParams={await searchParams} />;
}

async function RootCategoryPage({
  city, category, searchParams,
}: {
  city: City;
  category: Category;
  searchParams: CategorySearchParams;
}) {
  const [cats, directCounts] = await Promise.all([
    getAllCategories(),
    getListingCountsByCategory(city.id),
  ]);
  const children = cats.filter((c) => c.parentId === category.id);
  const subcategories = children
    .map((c) => ({ ...c, count: directCounts.get(c.id) ?? 0 }))
    .filter((c) => c.count > 0);
  const categoryIds = [category.id, ...children.map((c) => c.id)];
  const basePath = `/${city.slug}/${category.slug}`;

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6">
      <JsonLd data={buildBreadcrumbJsonLd([
        { name: "Главная", url: "/" },
        { name: city.name, url: `/${city.slug}` },
        { name: category.name, url: basePath },
      ], siteConfig.url)} />
      <Breadcrumbs items={[
        { label: "Главная", href: "/" },
        { label: city.name, href: `/${city.slug}` },
        { label: category.name },
      ]} />
      <h1 className="mb-4 mt-3 font-display text-2xl font-bold">
        Аренда: {category.name.toLowerCase()} в {city.name}
      </h1>
      <CategoryListing
        city={city}
        categoryIds={categoryIds}
        basePath={basePath}
        categoryBasePath={basePath}
        subcategories={subcategories}
        searchParams={searchParams}
      />
    </main>
  );
}

// Хаб города: категории с числом активных позиций + список прокатов.
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { seo } from "@theme/seo";
import {
  getAllCategories, getCityBySlug, getListingCountsByCategory,
  getProvidersOfCity, rollupToRoots,
} from "@/server/catalog";
import { listingsCountLabel } from "@/lib/catalog/format";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ city: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = await getCityBySlug(citySlug);
  if (!city) return {};
  return {
    title: seo.titleTemplate(`Прокат вещей в ${city.name}`),
    description: `Прокаты ${city.name}: инструмент, спорт, платья и другое. Каталог с ценами и заявкой на бронь онлайн.`,
  };
}

export default async function CityPage({ params }: Props) {
  const { city: citySlug } = await params;
  const city = await getCityBySlug(citySlug);
  if (!city) notFound();

  const [cats, direct, provs] = await Promise.all([
    getAllCategories(),
    getListingCountsByCategory(city.id),
    getProvidersOfCity(city.id),
  ]);
  const rootCounts = rollupToRoots(cats, direct);
  const roots = cats.filter((c) => c.parentId === null);

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6">
      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: city.name }]} />
      <h1 className="mt-3 font-display text-2xl font-bold">Прокат вещей в {city.name}</h1>

      <section aria-labelledby="city-cats" className="mt-6">
        <h2 id="city-cats" className="mb-3 text-lg font-semibold">Категории</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roots.map((cat) => (
            <Link
              key={cat.id}
              href={`/${city.slug}/${cat.slug}` as never}
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

      {provs.length > 0 && (
        <section aria-labelledby="city-provs" className="mt-10">
          <h2 id="city-provs" className="mb-3 text-lg font-semibold">Прокаты города</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {provs.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/${city.slug}/${p.slug}` as never}
                  className="block rounded-lg border border-border bg-card p-4 hover:border-primary"
                >
                  <span className="font-medium">{p.name}</span>
                  {p.address && (
                    <span className="mt-1 block text-sm text-muted-foreground">{p.address}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

// /{city}/{seg} — двусмысленный сегмент: категория (глобальный слаг,
// приоритет) или прокат (слаг в городе). Подкатегория по прямому слагу
// редиректится на канонический /{city}/{root}/{sub}.
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Clock, MapPin, Phone } from "lucide-react";
import { seo } from "@theme/seo";
import {
  getAllCategories, getCityBySlug, getListingCountsByCategory,
  getProviderListings, resolveCitySegment,
  type Category, type City, type Provider,
} from "@/server/catalog";
import { formatPrice } from "@/lib/catalog/format";
import { todayStr, addDaysStr } from "@/lib/catalog/dates";
import { getAvailabilityRows } from "@/server/catalog";
import { buildAvailabilityByListing } from "@/lib/catalog/availability";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { CategoryListing, type CategorySearchParams } from "@/components/catalog/CategoryListing";
import { ListingCard } from "@/components/catalog/ListingCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbJsonLd, buildLocalBusinessJsonLd } from "@/lib/jsonld";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ city: string; seg: string }>;
  searchParams: Promise<CategorySearchParams>;
}

async function resolve(citySlug: string, seg: string) {
  const city = await getCityBySlug(citySlug);
  if (!city) return null;
  const resolved = await resolveCitySegment(city.id, seg);
  if (!resolved) return null;
  return { city, resolved };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug, seg } = await params;
  const r = await resolve(citySlug, seg);
  if (!r) return {};
  const canonical = `${siteConfig.url}/${r.city.slug}/${seg}`;
  if (r.resolved.kind === "category") {
    const cat = r.resolved.category;
    return {
      title: seo.titleTemplate(`Аренда: ${cat.name.toLowerCase()} в ${r.city.name}`),
      description: `${cat.name} напрокат в ${r.city.name}: каталог позиций с ценами, залогами и календарём занятости.`,
      alternates: { canonical },
    };
  }
  const p = r.resolved.provider;
  return {
    title: seo.titleTemplate(`${p.name} — прокат в ${r.city.name}`),
    description: p.description ?? `Прокат «${p.name}» в ${r.city.name}: позиции, цены, контакты.`,
    alternates: { canonical },
  };
}

export default async function CitySegPage({ params, searchParams }: Props) {
  const { city: citySlug, seg } = await params;
  const r = await resolve(citySlug, seg);
  if (!r) notFound();
  const { city, resolved } = r;

  if (resolved.kind === "category") {
    const cat = resolved.category;
    if (cat.parentId !== null) {
      // Канонический адрес подкатегории — под корневой категорией.
      const cats = await getAllCategories();
      const root = cats.find((c) => c.id === cat.parentId);
      if (root) permanentRedirect(`/${city.slug}/${root.slug}/${cat.slug}`);
      notFound();
    }
    return <RootCategoryPage city={city} category={cat} searchParams={await searchParams} />;
  }

  return <ProviderPage city={city} provider={resolved.provider} />;
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

async function ProviderPage({ city, provider }: { city: City; provider: Provider }) {
  const items = await getProviderListings(provider.id);
  const phones = Array.isArray(provider.phones) ? (provider.phones as string[]) : [];
  // work_hours_json: {text: "..."} из формы кабинета или Record<период, часы> из сидов.
  const wh = provider.workHoursJson;
  const hoursText = wh && typeof wh === "object"
    ? (typeof (wh as Record<string, unknown>).text === "string"
        ? String((wh as Record<string, unknown>).text)
        : Object.entries(wh as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join(", "))
    : "";

  const from = todayStr();
  const availRows = await getAvailabilityRows(items.map((l) => l.id), from, addDaysStr(from, 6));
  const availByListing = buildAvailabilityByListing(availRows);

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6">
      <JsonLd data={buildLocalBusinessJsonLd({
        name: provider.name,
        description: provider.description,
        url: `${siteConfig.url}/${city.slug}/${provider.slug}`,
        cityName: city.name,
        address: provider.address,
        lat: provider.lat,
        lon: provider.lon,
        phones,
      })} />
      <JsonLd data={buildBreadcrumbJsonLd([
        { name: "Главная", url: "/" },
        { name: city.name, url: `/${city.slug}` },
        { name: provider.name, url: `/${city.slug}/${provider.slug}` },
      ], siteConfig.url)} />
      <Breadcrumbs items={[
        { label: "Главная", href: "/" },
        { label: city.name, href: `/${city.slug}` },
        { label: provider.name },
      ]} />
      <h1 className="mt-3 font-display text-2xl font-bold">{provider.name}</h1>

      <div className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
        {provider.address && (
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />{provider.address}, {city.name}
          </p>
        )}
        {phones.map((ph) => (
          <p key={ph} className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
            <a href={`tel:${ph.replace(/[^+\d]/g, "")}`} className="hover:text-foreground">{ph}</a>
          </p>
        ))}
        {hoursText && (
          <p className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
            {hoursText}
          </p>
        )}
      </div>

      {provider.description && (
        <p className="mt-4 max-w-2xl text-sm leading-body">{provider.description}</p>
      )}

      <section aria-labelledby="prov-listings" className="mt-8">
        <h2 id="prov-listings" className="mb-3 text-lg font-semibold">Позиции</h2>
        {items.length === 0 ? (
          <p className="py-8 text-muted-foreground">Пока нет активных позиций.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((listing) => (
              <ListingCard
                key={listing.id}
                item={{ listing, providerName: provider.name, providerSlug: provider.slug }}
                citySlug={city.slug}
                availabilityMap={availByListing.get(listing.id) ?? new Map()}
                from={from}
              />
            ))}
          </div>
        )}
      </section>

      {(() => {
        const dayPrices = items.map((l) => l.priceDay).filter((p): p is number => p !== null);
        return dayPrices.length > 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Цены от {formatPrice(Math.min(...dayPrices))} за сутки.
          </p>
        ) : null;
      })()}
    </main>
  );
}

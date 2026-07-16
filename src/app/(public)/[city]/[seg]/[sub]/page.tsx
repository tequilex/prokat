// /{city}/{seg}/{sub} — снова двусмысленно:
//   seg = категория  → sub = подкатегория (существует только с ≥1 активной позицией, иначе 404);
//   seg = прокат     → sub = позиция.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { seo } from "@theme/seo";
import {
  getAllCategories, getAvailabilityRows, getCategoryById, getCityBySlug,
  getListingBySlug, getListingCountsByCategory, listingPhotos, resolveCitySegment,
  type Category, type City, type Listing, type Provider,
} from "@/server/catalog";
import { formatDeposit, formatPrice } from "@/lib/catalog/format";
import { addDaysStr, todayStr } from "@/lib/catalog/dates";
import type { AvailabilityMap } from "@/lib/catalog/availability";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { FullCalendar } from "@/components/catalog/AvailabilityCalendar";
import { CategoryListing, type CategorySearchParams } from "@/components/catalog/CategoryListing";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbJsonLd, buildProductJsonLd } from "@/lib/jsonld";
import { siteConfig } from "@/lib/site-config";
import { freeQty } from "@/lib/catalog/availability";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ city: string; seg: string; sub: string }>;
  searchParams: Promise<CategorySearchParams>;
}

type Resolved =
  | { kind: "subcategory"; city: City; root: Category; sub: Category }
  | { kind: "listing"; city: City; provider: Provider; listing: Listing };

async function resolve(citySlug: string, seg: string, sub: string): Promise<Resolved | null> {
  const city = await getCityBySlug(citySlug);
  if (!city) return null;
  const first = await resolveCitySegment(city.id, seg);
  if (!first) return null;

  if (first.kind === "category") {
    if (first.category.parentId !== null) return null; // подкатегория не бывает базой
    const cats = await getAllCategories();
    const subCat = cats.find((c) => c.slug === sub && c.parentId === first.category.id);
    if (!subCat) return null;
    return { kind: "subcategory", city, root: first.category, sub: subCat };
  }

  const listing = await getListingBySlug(first.provider.id, sub);
  if (!listing) return null;
  return { kind: "listing", city, provider: first.provider, listing };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug, seg, sub } = await params;
  const r = await resolve(citySlug, seg, sub);
  if (!r) return {};
  const canonical = `${siteConfig.url}/${r.city.slug}/${seg}/${sub}`;
  if (r.kind === "subcategory") {
    return {
      title: seo.titleTemplate(`Аренда: ${r.sub.name.toLowerCase()} в ${r.city.name}`),
      description: `${r.sub.name} напрокат в ${r.city.name}: цены, залоги, календарь занятости.`,
      alternates: { canonical },
    };
  }
  const priceBit = r.listing.priceDay !== null ? ` от ${formatPrice(r.listing.priceDay)}/сутки` : "";
  return {
    title: seo.titleTemplate(`${r.listing.title} — аренда в ${r.city.name}${priceBit}`),
    description: r.listing.description ??
      `${r.listing.title} напрокат в ${r.city.name} — прокат «${r.provider.name}».`,
    alternates: { canonical },
  };
}

export default async function CitySubPage({ params, searchParams }: Props) {
  const { city: citySlug, seg, sub } = await params;
  const r = await resolve(citySlug, seg, sub);
  if (!r) notFound();

  if (r.kind === "subcategory") {
    return <SubcategoryPage r={r} searchParams={await searchParams} />;
  }
  return <ListingPage r={r} />;
}

async function SubcategoryPage({
  r, searchParams,
}: {
  r: Extract<Resolved, { kind: "subcategory" }>;
  searchParams: CategorySearchParams;
}) {
  const { city, root, sub } = r;
  const directCounts = await getListingCountsByCategory(city.id);
  // ТЗ: страница подкатегории существует только при ≥1 активной позиции.
  if ((directCounts.get(sub.id) ?? 0) === 0) notFound();

  const cats = await getAllCategories();
  const siblings = cats
    .filter((c) => c.parentId === root.id)
    .map((c) => ({ ...c, count: directCounts.get(c.id) ?? 0 }))
    .filter((c) => c.count > 0);

  const categoryBasePath = `/${city.slug}/${root.slug}`;

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6">
      <JsonLd data={buildBreadcrumbJsonLd([
        { name: "Главная", url: "/" },
        { name: city.name, url: `/${city.slug}` },
        { name: root.name, url: categoryBasePath },
        { name: sub.name, url: `${categoryBasePath}/${sub.slug}` },
      ], siteConfig.url)} />
      <Breadcrumbs items={[
        { label: "Главная", href: "/" },
        { label: city.name, href: `/${city.slug}` },
        { label: root.name, href: categoryBasePath },
        { label: sub.name },
      ]} />
      <h1 className="mb-4 mt-3 font-display text-2xl font-bold">
        Аренда: {sub.name.toLowerCase()} в {city.name}
      </h1>
      <CategoryListing
        city={city}
        categoryIds={[sub.id]}
        basePath={`${categoryBasePath}/${sub.slug}`}
        categoryBasePath={categoryBasePath}
        subcategories={siblings}
        activeSubSlug={sub.slug}
        searchParams={searchParams}
      />
    </main>
  );
}

async function ListingPage({ r }: { r: Extract<Resolved, { kind: "listing" }> }) {
  const { city, provider, listing } = r;
  const photos = listingPhotos(listing);
  const category = await getCategoryById(listing.categoryId);

  const from = todayStr();
  const rows = await getAvailabilityRows([listing.id], from, addDaysStr(from, 27));
  const map: AvailabilityMap = new Map(
    rows.map((row) => [row.date, { bookedQty: row.bookedQty, blockedQty: row.blockedQty }]),
  );

  const crumbs = [
    { label: "Главная", href: "/" },
    { label: city.name, href: `/${city.slug}` },
    ...(category ? [{ label: category.name, href: categoryHref(city, category) }] : []),
    { label: listing.title },
  ];

  // Продукт «в наличии», если в ближайшую неделю есть хотя бы один свободный день.
  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysStr(from, i));
  const available = weekDates.some((d) => freeQty(listing.quantity, map.get(d)) > 0);
  const listingUrl = `${siteConfig.url}/${city.slug}/${provider.slug}/${listing.slug}`;

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6 pb-24 md:pb-6">
      <JsonLd data={buildProductJsonLd({
        title: listing.title,
        description: listing.description,
        priceDay: listing.priceDay,
        photoUrls: photos.map((p) => p.url),
        url: listingUrl,
        providerName: provider.name,
        available,
      })} />
      <JsonLd data={buildBreadcrumbJsonLd(
        crumbs.map((c) => ({ name: c.label, url: c.href })),
        siteConfig.url,
      )} />
      <Breadcrumbs items={crumbs} />

      <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-[1fr_360px]">
        <div>
          {/* Галерея: простая сетка, без каруселей и JS */}
          {photos.length === 0 ? (
            <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <ImageOff className="h-10 w-10" aria-hidden="true" />
              <span className="sr-only">Без фото</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {photos.map((p, i) => (
                <div key={p.url} className={`relative overflow-hidden rounded-lg bg-muted ${i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-[4/3]"}`}>
                  <Image
                    src={p.url}
                    alt={`${listing.title} — фото ${i + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 60vw"
                    className="object-cover"
                    priority={i === 0}
                  />
                </div>
              ))}
            </div>
          )}

          <h1 className="mt-5 font-display text-2xl font-bold">{listing.title}</h1>
          {listing.description && (
            <p className="mt-3 max-w-2xl text-sm leading-body">{listing.description}</p>
          )}

          <section aria-labelledby="calendar-heading" className="mt-8">
            <h2 id="calendar-heading" className="mb-3 text-lg font-semibold">Занятость на 4 недели</h2>
            <FullCalendar quantity={listing.quantity} map={map} from={from} />
          </section>
        </div>

        <aside className="md:sticky md:top-20 md:self-start">
          <div className="rounded-lg border border-border bg-card p-4">
            <dl className="flex flex-col gap-2 text-sm">
              {listing.priceDay !== null && (
                <div className="flex items-baseline justify-between">
                  <dt className="text-muted-foreground">Сутки</dt>
                  <dd className="text-lg font-semibold">{formatPrice(listing.priceDay)}</dd>
                </div>
              )}
              {listing.priceWeek !== null && (
                <div className="flex items-baseline justify-between">
                  <dt className="text-muted-foreground">Неделя</dt>
                  <dd className="font-medium">{formatPrice(listing.priceWeek)}</dd>
                </div>
              )}
              {listing.priceHour !== null && (
                <div className="flex items-baseline justify-between">
                  <dt className="text-muted-foreground">Час</dt>
                  <dd className="font-medium">{formatPrice(listing.priceHour)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-border pt-2">
                <dt className="text-muted-foreground">Залог</dt>
                <dd>{formatDeposit(listing.depositType, listing.depositAmount)}</dd>
              </div>
              {listing.quantity > 1 && (
                <div className="flex items-baseline justify-between">
                  <dt className="text-muted-foreground">В наличии</dt>
                  <dd>{listing.quantity} шт.</dd>
                </div>
              )}
            </dl>

            {/* Заявки включаются на этапе флоу брони; сейчас кнопка-заглушка */}
            <Button className="mt-4 hidden w-full md:inline-flex" disabled title="Заявки скоро откроются">
              Забронировать
            </Button>

            <p className="mt-4 text-xs text-muted-foreground">
              Прокат{" "}
              <Link href={`/${city.slug}/${provider.slug}` as never} className="text-foreground hover:underline underline-offset-2">
                {provider.name}
              </Link>
              {provider.address ? ` · ${provider.address}` : null}
            </p>
          </div>
        </aside>
      </div>

      {/* Mobile: прилипшая к низу кнопка брони */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-1">
          <span className="text-sm font-semibold">
            {listing.priceDay !== null ? `${formatPrice(listing.priceDay)}/сутки` : ""}
          </span>
          <Button disabled title="Заявки скоро откроются">Забронировать</Button>
        </div>
      </div>
    </main>
  );
}

function categoryHref(city: City, category: Category): string {
  // Для подкатегории канонический путь требует родителя; здесь достаточно
  // короткого /{city}/{slug} — [seg] сам средиректит на канонику.
  return `/${city.slug}/${category.slug}`;
}

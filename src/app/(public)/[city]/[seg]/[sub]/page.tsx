// /{city}/{seg}/{sub} — снова двусмысленно:
//   seg = категория  → sub = подкатегория (существует только с ≥1 активной позицией, иначе 404);
//   seg = прокат     → sub = позиция.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
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
import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbJsonLd, buildProductJsonLd } from "@/lib/jsonld";
import { siteConfig } from "@/lib/site-config";
import { freeQty } from "@/lib/catalog/availability";
import { BOOKING_HORIZON_DAYS, parseBookingParams } from "@/lib/booking/params";
import { BookingWidget } from "@/components/booking/BookingWidget";
import { OwnerCard } from "@/components/booking/OwnerCard";
import { auth } from "@/lib/auth";
import { buildEdgeConfig } from "@/lib/auth/config.edge";
import { getEnv } from "@/lib/env";
import { getUserPhone } from "@/server/booking";
import { getDb } from "@/lib/db";
import { events } from "@db/schema";
import { newId } from "@/lib/id";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ city: string; seg: string; sub: string }>;
  // Категорийные фильтры + выбор дат брони (from/to/qty) на странице позиции.
  searchParams: Promise<CategorySearchParams & { from?: string; to?: string; qty?: string }>;
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
  return <ListingPage r={r} searchParams={await searchParams} />;
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

async function ListingPage({
  r, searchParams,
}: {
  r: Extract<Resolved, { kind: "listing" }>;
  searchParams: { from?: string; to?: string; qty?: string };
}) {
  const { city, provider, listing } = r;
  const photos = listingPhotos(listing);
  const category = await getCategoryById(listing.categoryId);

  // work_hours_json: {text: "..."} из формы кабинета или Record<период, часы> из сидов.
  const wh = provider.workHoursJson;
  const hoursText = wh && typeof wh === "object"
    ? (typeof (wh as Record<string, unknown>).text === "string"
        ? String((wh as Record<string, unknown>).text)
        : Object.entries(wh as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join(", "))
    : "";

  const session = await auth();
  const isAuthed = Boolean(session?.user);
  const initialPhone = session?.user?.id ? (await getUserPhone(session.user.id)) ?? "" : "";
  const env = getEnv();
  const nextAuthProviders = (buildEdgeConfig().providers ?? []).flatMap((p) => {
    const id = (p as { id?: string }).id;
    return id ? [id] : [];
  });
  const vkEnabled = Boolean(env.VK_CLIENT_ID && env.VK_CLIENT_SECRET);
  const isDev = env.NODE_ENV !== "production";

  // Занятость на весь горизонт бронирования: календарь показывает первые
  // 4 недели, виджет валидирует выбор дат по всем 90 дням.
  const from = todayStr();
  const rows = await getAvailabilityRows([listing.id], from, addDaysStr(from, BOOKING_HORIZON_DAYS));
  const map: AvailabilityMap = new Map(
    rows.map((row) => [row.date, { bookedQty: row.bookedQty, blockedQty: row.blockedQty }]),
  );
  // Map не сериализуется через RSC-границу — клиентскому виджету отдаём plain object.
  const availabilityRecord = Object.fromEntries(map);

  // Выбор дат/qty из URL (восстанавливается после OAuth-redirect).
  const selection = parseBookingParams(searchParams, { today: from, maxQty: listing.quantity });

  // view_listing — сырьё для статистики владельца. Ошибка записи не должна
  // ронять страницу.
  try {
    await getDb().insert(events).values({
      id: newId(),
      entityType: "listing",
      entityId: listing.id,
      event: "view_listing",
      userId: session?.user?.id ?? null,
    });
  } catch (e) {
    console.error("[events] view_listing insert failed:", e);
  }

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
            <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <ImageOff className="h-10 w-10" aria-hidden="true" />
              <span className="sr-only">Без фото</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {photos.map((p, i) => (
                <div key={p.url} className={`relative overflow-hidden rounded-2xl bg-muted ${i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-[4/3]"}`}>
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

          <div className="mt-5">
            <OwnerCard
              name={provider.name}
              href={`/${city.slug}/${provider.slug}`}
              isVerified={provider.isVerified}
              address={provider.address}
              hoursText={hoursText}
            />
          </div>

          <section aria-labelledby="calendar-heading" className="mt-8">
            <h2 id="calendar-heading" className="mb-3 text-lg font-semibold">Занятость на 4 недели</h2>
            <FullCalendar quantity={listing.quantity} map={map} from={from} />
          </section>
        </div>

        <aside className="md:sticky md:top-20 md:self-start">
          <BookingWidget
            listingId={listing.id}
            listingTitle={listing.title}
            initialPhone={initialPhone}
            pathname={`/${city.slug}/${provider.slug}/${listing.slug}`}
            initial={selection}
            today={from}
            maxDate={addDaysStr(from, BOOKING_HORIZON_DAYS)}
            availability={availabilityRecord}
            quantity={listing.quantity}
            priceDay={listing.priceDay}
            priceWeek={listing.priceWeek}
            priceHour={listing.priceHour}
            depositLabel={formatDeposit(listing.depositType, listing.depositAmount)}
            providerName={provider.name}
            providerHref={`/${city.slug}/${provider.slug}`}
            providerAddress={provider.address}
            isAuthed={isAuthed}
            nextAuthProviders={nextAuthProviders}
            vkEnabled={vkEnabled}
            isDev={isDev}
          />
        </aside>
      </div>
    </main>
  );
}

function categoryHref(city: City, category: Category): string {
  // Для подкатегории канонический путь требует родителя; здесь достаточно
  // короткого /{city}/{slug} — [seg] сам средиректит на канонику.
  return `/${city.slug}/${category.slug}`;
}

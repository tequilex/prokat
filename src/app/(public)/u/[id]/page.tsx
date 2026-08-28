// Публичный профиль продавца — витрина, а не служебная страница: обложка,
// которую владелец загрузил в кабинете, аватар нахлёстом, имя, «на сайте с»,
// значок «Проверен», bio и сетка активных объявлений. Резолв по id: ника в
// системе нет, а имя в адрес не выносим — это частное лицо, а не магазин.
import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/EmptyState";
import { notFound } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import {
  getSellerById, getSellerStats, getActiveListingCardsByOwner, getAvailabilityRows,
} from "@/server/catalog";
import { buildAvailabilityByListing } from "@/lib/catalog/availability";
import { todayStr, addDaysStr, formatMonthYearGen } from "@/lib/catalog/dates";
import { Avatar } from "@/components/ui/Avatar";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { ListingCard } from "@/components/catalog/ListingCard";
import { ProfileCover } from "@/components/account/ProfileCover";
import { ruPlural } from "@/lib/plural";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const seller = await getSellerById(id);
  if (!seller || seller.bannedAt) return {};
  // Имя может отсутствовать: у OAuth-профиля без имени и у старых записей.
  const name = seller.name ?? "Продавец";
  return {
    title: `${name} — объявления`,
    description: `Объявления пользователя ${name}: аренда вещей с бронью онлайн.`,
    alternates: { canonical: `${siteConfig.url}/u/${id}` },
  };
}

export default async function SellerProfilePage({ params }: Props) {
  const { id } = await params;
  const seller = await getSellerById(id);
  // Витрина забаненного закрыта: он загружает обложку и bio сам, и после бана
  // они не должны оставаться на публичном адресе.
  if (!seller || seller.bannedAt) notFound();

  const [stats, items] = await Promise.all([
    getSellerStats(seller.id),
    getActiveListingCardsByOwner(seller.id),
  ]);
  const from = todayStr();
  const availRows = await getAvailabilityRows(items.map((i) => i.listing.id), from, addDaysStr(from, 6));
  const availByListing = buildAvailabilityByListing(availRows);

  const displayName = seller.name ?? "Продавец";
  // «Казань · на сайте с марта 2024 · 11 аренд» — сегменты, которых нет,
  // просто выпадают: без города и без аренд строка остаётся честной.
  const byline = [
    stats.cityName,
    `на сайте с ${formatMonthYearGen(seller.createdAt)}`,
    stats.deals > 0 ? `${stats.deals} ${ruPlural(stats.deals, "аренда", "аренды", "аренд")}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <main data-cover-hero="all">
      {/* Обложка уезжает под стеклянный хедер; крошки лежат на фото под ним,
        * затемнение держит их читаемыми на любой фотографии. */}
      <ProfileCover src={seller.coverUrl} className="-mt-[var(--header-h)] h-40 md:h-80" priority>
        <div className="absolute inset-x-0 top-[calc(var(--header-h)+4px)] px-4">
          {/* Обложка тёмная в обеих темах (своя или стандартная), поэтому
            * крошки всегда светлые: утилиты Breadcrumbs читают токены, здесь
            * они локально переопределены. */}
          <div className="mx-auto w-full max-w-[1200px] [--color-foreground:#F5F5F7] [--color-muted-fg:rgba(245,245,247,0.72)]">
            <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: displayName }]} />
          </div>
        </div>
      </ProfileCover>

      <div className="mx-auto w-full max-w-[1200px] px-4 pb-8">
        <header className="relative -mt-8 flex flex-col gap-3 md:-mt-[52px] md:flex-row md:items-end md:gap-5">
          {/* Размер аватара у Avatar задан пропом (инлайновые width/height),
            * поэтому на брейкпоинте не масштабируется классом — рендерим два. */}
          <span className="md:hidden">
            <Avatar src={seller.image} name={seller.name} size={72} className="shadow-[0_0_0_3px_var(--color-background)]" />
          </span>
          <span className="hidden md:block">
            <Avatar src={seller.image} name={seller.name} size={120} className="shadow-[0_0_0_4px_var(--color-background)]" />
          </span>
          <div className="min-w-0 flex-1 md:pb-1.5">
            <h1 className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-display text-2xl font-extrabold tracking-tight md:text-[32px] md:leading-tight">
              {displayName}
              {seller.isVerified && (
                <span className="inline-flex items-center gap-1 rounded-sm bg-accent/15 px-2.5 py-0.5 text-sm font-medium text-accent">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Проверенный продавец
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{byline}</p>
          </div>
        </header>

        {seller.bio && (
          <p className="mt-4 max-w-2xl text-[15px] leading-body [text-wrap:pretty] md:mt-5">
            {seller.bio}
          </p>
        )}

        <section aria-labelledby="seller-listings" className="mt-8">
          <h2 id="seller-listings" className="mb-3.5 font-display text-xl font-bold">
            {items.length > 0
              ? `${items.length} ${ruPlural(items.length, "вещь", "вещи", "вещей")} в аренду`
              : "Вещи в аренду"}
          </h2>
          {items.length === 0 ? (
            <EmptyState className="min-h-[25svh]">У продавца пока нет активных объявлений.</EmptyState>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
              {items.map((item) => (
                <ListingCard
                  key={item.listing.id}
                  item={item}
                  citySlug={item.citySlug}
                  availabilityMap={availByListing.get(item.listing.id) ?? new Map()}
                  from={from}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

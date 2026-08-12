import Link from "next/link";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { listingPhotos, type Listing, type ListingWithOwner } from "@/server/catalog";
import { formatPrice } from "@/lib/catalog/format";
import { listingPath } from "@/lib/catalog/listing-path";
import type { AvailabilityMap } from "@/lib/catalog/availability";
import { MiniCalendar } from "@/components/catalog/AvailabilityCalendar";
import { Avatar } from "@/components/ui/Avatar";

const NEW_DAYS = 14;

function isNew(createdAt: Date): boolean {
  return Date.now() - new Date(createdAt).getTime() < NEW_DAYS * 24 * 60 * 60 * 1000;
}

function priceLabel(l: Listing): string | null {
  if (l.priceDay !== null) return `${formatPrice(l.priceDay)}/сутки`;
  if (l.priceHour !== null) return `${formatPrice(l.priceHour)}/час`;
  if (l.priceWeek !== null) return `${formatPrice(l.priceWeek)}/неделя`;
  return null;
}

// Единая карточка товара для всего проекта (главная, каталог, поиск, профиль).
// Скошенные углы + бейдж «Новое» + аватар владельца + зелёная цена. Мини-календарь
// занятости — опционально: рисуется, только если переданы availabilityMap и from.
export function ListingCard({
  item,
  citySlug,
  availabilityMap,
  from,
}: {
  item: ListingWithOwner;
  citySlug: string;
  availabilityMap?: AvailabilityMap;
  from?: string;
}) {
  const { listing, ownerName, ownerImage, categorySlug } = item;
  const photo = listingPhotos(listing)[0];
  const href = listingPath(citySlug, categorySlug, listing.slug, listing.id);
  const price = priceLabel(listing);

  return (
    <article className="flex flex-col">
      <Link
        href={href as never}
        className="group relative block aspect-[4/3] overflow-hidden rounded-tl-[26px] rounded-tr-[8px] rounded-bl-[8px] rounded-br-[26px] bg-muted"
      >
        {photo ? (
          <Image
            src={photo.url}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-8 w-8" aria-hidden="true" />
            <span className="sr-only">Без фото</span>
          </span>
        )}

        {isNew(listing.createdAt) && (
          <span className="absolute left-3 top-3 rounded-pill bg-accent px-2.5 py-1 font-mono text-2xs font-medium uppercase tracking-mono text-accent-foreground">
            Новое
          </span>
        )}

        <span className="absolute bottom-3 right-3 rounded-full ring-2 ring-white/80">
          <Avatar src={ownerImage} name={ownerName} size={36} />
        </span>
      </Link>

      <Link href={href as never} className="mt-2.5 block">
        <h3 className="line-clamp-1 text-sm font-medium text-foreground hover:underline">
          {listing.title}
        </h3>
      </Link>
      {price && <p className="font-mark text-sm font-bold">{price}</p>}

      {availabilityMap && from && (
        <div className="mt-2">
          <MiniCalendar quantity={listing.quantity} map={availabilityMap} from={from} />
        </div>
      )}
    </article>
  );
}

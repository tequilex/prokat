import Link from "next/link";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { listingPhotos, type ListingWithOwner } from "@/server/catalog";
import { formatDeposit, formatPrice } from "@/lib/catalog/format";
import { listingPath } from "@/lib/catalog/listing-path";
import type { AvailabilityMap } from "@/lib/catalog/availability";
import { MiniCalendar } from "@/components/catalog/AvailabilityCalendar";

export function ListingCard({
  item, citySlug, availabilityMap, from,
}: {
  item: ListingWithOwner;
  citySlug: string;
  availabilityMap: AvailabilityMap;
  from: string;
}) {
  const { listing, ownerName, ownerUsername, categorySlug } = item;
  const photo = listingPhotos(listing)[0];
  const href = listingPath(citySlug, categorySlug, listing.slug, listing.id);
  const sellerLabel = ownerName ?? "Продавец";

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground transition-transform hover:border-primary active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100">
      <Link href={href as never} className="relative block aspect-[4/3] bg-muted">
        {photo ? (
          <Image
            src={photo.url}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-8 w-8" aria-hidden="true" />
            <span className="sr-only">Без фото</span>
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-tight">
          <Link href={href as never} className="hover:underline underline-offset-2">
            {listing.title}
          </Link>
        </h3>

        <p className="text-base font-bold tracking-tight">
          {listing.priceDay !== null ? (
            <>{formatPrice(listing.priceDay)}<span className="text-sm font-normal text-muted-foreground">/сутки</span></>
          ) : listing.priceHour !== null ? (
            <>{formatPrice(listing.priceHour)}<span className="text-sm font-normal text-muted-foreground">/час</span></>
          ) : null}
        </p>

        <p className="text-xs text-muted-foreground">
          {formatDeposit(listing.depositType, listing.depositAmount)}
        </p>

        <MiniCalendar quantity={listing.quantity} map={availabilityMap} from={from} />

        <p className="mt-auto pt-1 text-xs text-muted-foreground">
          {ownerUsername ? (
            <Link href={`/u/${ownerUsername}` as never} className="hover:text-foreground hover:underline underline-offset-2">
              {sellerLabel}
            </Link>
          ) : (
            sellerLabel
          )}
        </p>
      </div>
    </article>
  );
}

import Link from "next/link";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { listingPhotos, type ListingWithProvider } from "@/server/catalog";
import { formatDeposit, formatPrice } from "@/lib/catalog/format";
import type { AvailabilityMap } from "@/lib/catalog/availability";
import { MiniCalendar } from "@/components/catalog/AvailabilityCalendar";

export function ListingCard({
  item, citySlug, availabilityMap, from,
}: {
  item: ListingWithProvider;
  citySlug: string;
  availabilityMap: AvailabilityMap;
  from: string;
}) {
  const { listing, providerName, providerSlug } = item;
  const photo = listingPhotos(listing)[0];
  const href = `/${citySlug}/${providerSlug}/${listing.slug}`;

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground">
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

        <p className="text-base font-semibold">
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
          <Link href={`/${citySlug}/${providerSlug}` as never} className="hover:text-foreground hover:underline underline-offset-2">
            {providerName}
          </Link>
        </p>
      </div>
    </article>
  );
}

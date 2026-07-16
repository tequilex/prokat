import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ImageOff } from "lucide-react";
import { requireAuthState } from "@/lib/auth/guard";
import { getOwnerListings, getOwnerProvider, getProviderCity } from "@/server/owner";
import { listingPhotos } from "@/server/catalog";
import { formatPrice } from "@/lib/catalog/format";
import { Button } from "@/components/ui/button";
import { ListingStatusButtons } from "@/components/cabinet/ListingStatusButtons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Мои позиции", robots: { index: false } };

const STATUS_LABEL: Record<string, string> = {
  active: "Активна",
  hidden: "Скрыта",
  archived: "Архив",
  on_moderation: "На модерации",
};

export default async function CabinetListingsPage() {
  const session = await requireAuthState();
  if (!session) redirect("/login?from=/cabinet");
  const provider = await getOwnerProvider(session.user.id);
  if (!provider) redirect("/cabinet/new");

  const [items, city] = await Promise.all([
    getOwnerListings(provider.id),
    getProviderCity(provider.cityId),
  ]);

  return (
    <section aria-label="Мои позиции">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} позиций</p>
        <Button asChild size="sm">
          <Link href={"/cabinet/listings/new" as never}>+ Добавить позицию</Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          Добавьте первую позицию — она появится в каталоге.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((l) => {
            const photo = listingPhotos(l)[0];
            return (
              <li key={l.id} className="flex gap-3 rounded-lg border border-border bg-card p-3">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                  {photo ? (
                    <Image src={photo.url} alt={l.title} fill sizes="80px" className="object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-muted-foreground">
                      <ImageOff className="h-6 w-6" aria-hidden="true" />
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Link href={`/cabinet/listings/${l.id}` as never} className="font-medium hover:underline underline-offset-2">
                      {l.title}
                    </Link>
                    <span className="rounded-pill bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {STATUS_LABEL[l.status] ?? l.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {l.priceDay !== null ? `${formatPrice(l.priceDay)}/сутки` : "—"}
                    {" · "}{l.quantity} шт.
                    {city && l.status === "active" && (
                      <>
                        {" · "}
                        <Link href={`/${city.slug}/${provider.slug}/${l.slug}` as never} className="hover:text-foreground underline-offset-2 hover:underline">
                          посмотреть в каталоге
                        </Link>
                      </>
                    )}
                  </p>
                  <div className="mt-1">
                    <ListingStatusButtons listingId={l.id} status={l.status} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

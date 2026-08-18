import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ImageOff } from "lucide-react";
import { requireAuthState } from "@/lib/auth/guard";
import { getOwnerListings } from "@/server/owner";
import { getActiveCities, getAllCategories, listingPhotos } from "@/server/catalog";
import { listingPath } from "@/lib/catalog/listing-path";
import { formatPrice } from "@/lib/catalog/format";
import { Button } from "@/components/ui/button";
import { ListingStatusButtons } from "@/components/cabinet/ListingStatusButtons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Мои объявления", robots: { index: false } };

const STATUS_LABEL: Record<string, string> = {
  active: "Активно",
  hidden: "Скрыто",
  archived: "Архив",
};

export default async function CabinetListingsPage() {
  const session = await requireAuthState();
  if (!session) redirect("/login?from=/cabinet");

  const [items, cities, cats] = await Promise.all([
    getOwnerListings(session.user.id),
    getActiveCities(),
    getAllCategories(),
  ]);
  const citySlug = new Map(cities.map((c) => [c.id, c.slug]));
  const catSlug = new Map(cats.map((c) => [c.id, c.slug]));

  return (
    <section aria-label="Мои объявления">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} объявлений</p>
        <Button asChild size="sm">
          <Link href={"/cabinet/listings/new" as never}>+ Разместить</Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState>Разместите первое объявление — оно появится в каталоге.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((l) => {
            const photo = listingPhotos(l)[0];
            const cSlug = citySlug.get(l.cityId);
            const catS = catSlug.get(l.categoryId);
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
                    {cSlug && catS && l.status === "active" && (
                      <>
                        {" · "}
                        <Link href={listingPath(cSlug, catS, l.slug, l.id) as never} className="hover:text-foreground underline-offset-2 hover:underline">
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

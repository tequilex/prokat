import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { requireAuthState } from "@/lib/auth/guard";
import { getOwnerListing } from "@/server/owner";
import { getActiveCities, getAllCategories, listingPhotos } from "@/server/catalog";
import { leafCategories } from "@/lib/owner/categories";
import { ListingForm } from "@/components/cabinet/ListingForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Редактирование объявления", robots: { index: false } };

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuthState();
  if (!session) redirect("/login?from=/cabinet");

  const { id } = await params;
  const [listing, cities, cats] = await Promise.all([
    getOwnerListing(session.user.id, id),
    getActiveCities(),
    getAllCategories(),
  ]);
  if (!listing) notFound();

  // Правка статуса не меняет, поэтому архивное объявление после сохранения в
  // общий список не вернётся — и уводить туда человека нельзя.
  const isArchived = listing.status === "archived";
  const backHref = isArchived ? "/cabinet/listings/archive" : "/cabinet/listings";

  return (
    <main>
      {/* Только на десктопе: на мобиле кнопку «назад» рисует сама оболочка
        * кабинета, и вторая шла бы сразу за ней. Ссылка, а не router.back():
        * по прямому адресу возвращает в список, а не в предыдущую страницу. */}
      <Link
        href={backHref}
        className="mb-3 hidden items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline md:inline-flex"
      >
        <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
        {isArchived ? "К архиву" : "К объявлениям"}
      </Link>

      <ListingForm
        mode="edit"
        listingId={listing.id}
        returnHref={backHref}
        cities={cities.map((c) => ({ id: c.id, name: c.name }))}
        categories={leafCategories(cats)}
        initial={{
          title: listing.title,
          cityId: listing.cityId,
          categoryId: listing.categoryId,
          location: listing.location ?? "",
          description: listing.description ?? "",
          priceDay: String(listing.priceDay),
          depositType: listing.depositType,
          depositAmount: listing.depositAmount?.toString() ?? "",
          quantity: String(listing.quantity),
          handoverPickup: listing.handoverPickup,
          handoverDelivery: listing.handoverDelivery,
          photos: listingPhotos(listing),
        }}
      />
    </main>
  );
}

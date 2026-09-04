import type { Metadata } from "next";
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

  return (
    <main>
      <ListingForm
        mode="edit"
        listingId={listing.id}
        cities={cities.map((c) => ({ id: c.id, name: c.name }))}
        categories={leafCategories(cats)}
        initial={{
          title: listing.title,
          cityId: listing.cityId,
          categoryId: listing.categoryId,
          location: listing.location ?? "",
          description: listing.description ?? "",
          priceDay: listing.priceDay?.toString() ?? "",
          priceHour: listing.priceHour?.toString() ?? "",
          priceWeek: listing.priceWeek?.toString() ?? "",
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

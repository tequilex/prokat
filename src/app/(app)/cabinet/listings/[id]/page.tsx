import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireAuthState } from "@/lib/auth/guard";
import { getOwnerListing, getOwnerProvider } from "@/server/owner";
import { getAllCategories, listingPhotos } from "@/server/catalog";
import { leafCategories } from "@/lib/owner/categories";
import { ListingForm } from "@/components/cabinet/ListingForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Редактирование позиции", robots: { index: false } };

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuthState();
  if (!session) redirect("/login?from=/cabinet");
  const provider = await getOwnerProvider(session.user.id);
  if (!provider) redirect("/cabinet/new");

  const { id } = await params;
  const listing = await getOwnerListing(provider.id, id);
  if (!listing) notFound();

  const cats = await getAllCategories();

  return (
    <main>
      <h2 className="mb-4 text-lg font-semibold">Редактирование: {listing.title}</h2>
      <ListingForm
        mode="edit"
        listingId={listing.id}
        categories={leafCategories(cats)}
        initial={{
          title: listing.title,
          categoryId: listing.categoryId,
          description: listing.description ?? "",
          priceDay: listing.priceDay?.toString() ?? "",
          priceHour: listing.priceHour?.toString() ?? "",
          priceWeek: listing.priceWeek?.toString() ?? "",
          depositType: listing.depositType,
          depositAmount: listing.depositAmount?.toString() ?? "",
          quantity: String(listing.quantity),
          photos: listingPhotos(listing),
        }}
      />
    </main>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthState } from "@/lib/auth/guard";
import { getOwnerProvider } from "@/server/owner";
import { getAllCategories } from "@/server/catalog";
import { leafCategories } from "@/lib/owner/categories";
import { ListingForm } from "@/components/cabinet/ListingForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Новая позиция", robots: { index: false } };

export default async function NewListingPage() {
  const session = await requireAuthState();
  if (!session) redirect("/login?from=/cabinet");
  const provider = await getOwnerProvider(session.user.id);
  if (!provider) redirect("/cabinet/new");

  const cats = await getAllCategories();

  return (
    <main>
      <h2 className="mb-4 text-lg font-semibold">Новая позиция</h2>
      <ListingForm
        mode="create"
        categories={leafCategories(cats)}
        initial={{
          title: "", categoryId: "", description: "",
          priceDay: "", priceHour: "", priceWeek: "",
          depositType: "money", depositAmount: "", quantity: "1", photos: [],
        }}
      />
    </main>
  );
}

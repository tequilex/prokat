import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthState } from "@/lib/auth/guard";
import { getActiveCities, getAllCategories } from "@/server/catalog";
import { leafCategories } from "@/lib/owner/categories";
import { ListingForm } from "@/components/cabinet/ListingForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Новое объявление", robots: { index: false } };

export default async function NewListingPage() {
  const session = await requireAuthState();
  if (!session) redirect("/login?from=/cabinet");

  const [cities, cats] = await Promise.all([getActiveCities(), getAllCategories()]);

  return (
    <main>
      <ListingForm
        mode="create"
        cities={cities.map((c) => ({ id: c.id, name: c.name }))}
        categories={leafCategories(cats)}
        initial={{
          title: "", cityId: "", categoryId: "", location: "", description: "",
          priceDay: "", priceHour: "", priceWeek: "",
          depositType: "money", depositAmount: "", quantity: "1", photos: [],
        }}
      />
    </main>
  );
}

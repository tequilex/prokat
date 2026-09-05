import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthState } from "@/lib/auth/guard";
import { getActiveCities, getAllCategories } from "@/server/catalog";
import { resolveOwnCity } from "@/server/city";
import { leafCategories } from "@/lib/owner/categories";
import { ListingForm } from "@/components/cabinet/ListingForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Новое объявление", robots: { index: false } };

export default async function NewListingPage() {
  const session = await requireAuthState();
  if (!session) redirect("/login?from=/cabinet");

  // Город предзаполняем «своим», а не тем, который человек сейчас листает:
  // вещь лежит там, где он живёт. Поле остаётся редактируемым.
  const [cities, cats, ownCity] = await Promise.all([
    getActiveCities(), getAllCategories(), resolveOwnCity(),
  ]);

  return (
    <main>
      <ListingForm
        mode="create"
        // Имя берём из сессии: лишнего запроса в БД не нужно.
        sellerName={session.user.name ?? ""}
        cities={cities.map((c) => ({ id: c.id, name: c.name }))}
        categories={leafCategories(cats)}
        initial={{
          title: "", cityId: ownCity?.id ?? "", categoryId: "", location: "", description: "",
          priceDay: "",
          depositType: "money", depositAmount: "", quantity: "1",
          handoverPickup: true, handoverDelivery: false,
          photos: [],
        }}
      />
    </main>
  );
}

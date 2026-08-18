import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/EmptyState";
import { getActiveCities, getCityBySlug } from "@/server/catalog";
import { parseQuery, type CategorySearchParams } from "@/lib/catalog/filters";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { SearchResults } from "@/components/catalog/SearchResults";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Поиск" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<CategorySearchParams>;
}) {
  const sp = await searchParams;
  const q = parseQuery(sp);

  // Поиск в пределах города: ?city=… или город по умолчанию (первый активный).
  const city = sp.city
    ? await getCityBySlug(sp.city)
    : (await getActiveCities())[0] ?? null;

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6">
      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Поиск" }]} />
      <h1 className="mb-4 mt-3 font-display text-2xl font-bold">
        {q ? <>Поиск: «{q}»</> : "Поиск"}
      </h1>

      {city ? (
        <SearchResults city={city} q={q} searchParams={sp} />
      ) : (
        <EmptyState>Города пока не заведены.</EmptyState>
      )}
    </main>
  );
}

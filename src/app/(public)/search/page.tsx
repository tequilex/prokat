import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { getActiveCities, getCityBySlug } from "@/server/catalog";
import { parseQuery, type CategorySearchParams } from "@/lib/catalog/filters";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { SearchResults } from "@/components/catalog/SearchResults";

export const dynamic = "force-dynamic";

// noindex: без запроса страница показывает ту же выдачу, что и витрина города,
// а с параметрами разворачивается в бесконечную комбинаторику фильтров. Для
// поиска индексируются категорийные страницы — они и лежат в sitemap.
// Здесь именно noindex, а не Disallow в robots.txt: закрытый от обхода адрес
// робот не скачает и запрета внутри не прочитает.
export const metadata: Metadata = { title: "Поиск", robots: { index: false } };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<CategorySearchParams>;
}) {
  const sp = await searchParams;
  const q = parseQuery(sp);

  // Поиск в пределах города: ?city=… или город по умолчанию (первый активный).
  // Город здесь несущий, а не декоративный, поэтому чужой слаг — это 404, а не
  // молчаливый откат к другому городу с чужой выдачей.
  const city = sp.city
    ? (await getCityBySlug(sp.city)) ?? notFound()
    : (await getActiveCities())[0] ?? null;

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6">
      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Поиск" }]} />
      {/* Город отделён точкой, а не предлогом: в базе он лежит в именительном
        * падеже, и «поиск по Казань» из него не собрать. */}
      <h1 className="mb-4 mt-3 font-display text-2xl font-bold">
        {q ? <>Поиск: «{q}»</> : "Поиск"}
        {city && (
          <span className="ml-2 text-base font-normal text-muted-foreground">
            · {city.name}
          </span>
        )}
      </h1>

      {city ? (
        <SearchResults city={city} q={q} searchParams={sp} />
      ) : (
        <EmptyState>Города пока не заведены.</EmptyState>
      )}
    </main>
  );
}

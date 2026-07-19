import type { Metadata } from "next";

export const metadata: Metadata = { title: "Поиск" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-10">
      <h1 className="font-display text-2xl font-bold">Поиск</h1>
      <p className="mt-2 text-muted-foreground">
        {q
          ? `Запрос: «${q}». Полноценный поиск появится позже.`
          : "Введите запрос в строке поиска."}
      </p>
    </main>
  );
}

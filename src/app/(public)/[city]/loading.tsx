import { LoadingState } from "@/components/ui/LoadingState";

// Покрывает витрину города и всё, что под ней: категории, подкатегории,
// карточку товара.
export default function CityLoading() {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6">
      <LoadingState title="Ищем рядом…" hint="смотрим, что сдают поблизости" />
    </main>
  );
}

import { LoadingState } from "@/components/ui/LoadingState";

export default function SearchLoading() {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6">
      <LoadingState title="Ищем…" hint="подбираем совпадения" />
    </main>
  );
}

import { LoadingState } from "@/components/ui/LoadingState";

export default function SearchLoading() {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6">
      {/* Заголовок по умолчанию, из theme/content: этот же экран показывается и
        * когда запроса нет вовсе, а searchParams в loading.tsx не приходят —
        * разветвить текст нечем, поэтому и «подбираем совпадения» ушло. */}
      <LoadingState hint="смотрим, что сдают поблизости" />
    </main>
  );
}

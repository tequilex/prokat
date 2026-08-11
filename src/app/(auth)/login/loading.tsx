import { Logo } from "@/components/brand/Logo";

// Suspense-fallback для /login: Next.js показывает его сразу после клика по
// ссылке, пока RSC `LoginPage` блокирует на `await auth()`. Геометрия повторяет
// карточку из page.tsx — знак сверху, поля, кнопки — чтобы между фолбэком и
// реальной формой не было скачка.
export default function LoginLoading() {
  return (
    <main className="container mx-auto flex min-h-[calc(100vh-14rem)] max-w-md flex-col items-center justify-center px-4 py-12">
      <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-5 flex justify-center">
          <Logo size={22} />
        </div>
        <div className="flex flex-col gap-3" aria-hidden="true">
          <div className="h-11 animate-pulse rounded-pill bg-muted" />
          <div className="h-11 animate-pulse rounded-pill bg-muted" />
          <div className="h-11 animate-pulse rounded-pill bg-muted" />
          <div className="mt-2 h-12 animate-pulse rounded-pill bg-muted" />
        </div>
      </div>
    </main>
  );
}

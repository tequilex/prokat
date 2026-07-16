// Каркас кабинета владельца. Онбординг-гейт: без провайдера — только
// /cabinet/new; с провайдером /cabinet/new недоступен. Текущий путь
// приходит из middleware через x-pathname.

import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAuthState } from "@/lib/auth/guard";
import { countNewRequests, getOwnerProvider } from "@/server/owner";

const TABS = [
  { href: "/cabinet/requests", label: "Заявки" },
  { href: "/cabinet/calendar", label: "Календарь" },
  { href: "/cabinet/listings", label: "Позиции" },
  { href: "/cabinet/stats", label: "Статистика" },
  { href: "/cabinet/settings", label: "Настройки" },
] as const;

export default async function CabinetLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuthState();
  if (!session) redirect("/login?from=/cabinet");

  const provider = await getOwnerProvider(session.user.id);
  const pathname = (await headers()).get("x-pathname") ?? "/cabinet";

  if (!provider && pathname !== "/cabinet/new") redirect("/cabinet/new");
  if (provider && pathname === "/cabinet/new") redirect("/cabinet/requests");

  const newCount = provider ? await countNewRequests(provider.id) : 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      {provider && (
        <>
          <h1 className="font-display text-2xl font-bold">{provider.name}</h1>
          <nav aria-label="Разделы кабинета" className="mt-4 flex gap-1 overflow-x-auto border-b border-border">
            {TABS.map((t) => {
              const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
              return (
                <Link
                  key={t.href}
                  href={t.href as never}
                  className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
                    active
                      ? "border-primary font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                  {t.href === "/cabinet/requests" && newCount > 0 && (
                    <span className="ml-1.5 rounded-pill bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                      {newCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </>
      )}
      <div className="mt-5">{children}</div>
    </div>
  );
}

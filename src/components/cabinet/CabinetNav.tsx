"use client";

// Табы кабинета. Активность — через usePathname на клиенте: серверный
// x-pathname ненадёжен при client-side навигации (см. историю с циклом
// редиректов онбординг-гейта).

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/cabinet/requests", label: "Заявки" },
  { href: "/cabinet/calendar", label: "Календарь" },
  { href: "/cabinet/listings", label: "Позиции" },
  { href: "/cabinet/stats", label: "Статистика" },
  { href: "/cabinet/settings", label: "Настройки" },
] as const;

export function CabinetNav({ newCount }: { newCount: number }) {
  const pathname = usePathname() ?? "";
  return (
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
  );
}

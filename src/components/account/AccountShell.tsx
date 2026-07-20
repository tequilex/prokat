"use client";

// Универсальный шелл личных зон (кабинет владельца, кабинет покупателя,
// админка) в стилистике shadcn-sidebar, но на своих токенах и без тяжёлых
// зависимостей: десктоп — сайдбар слева, мобила — горизонтальные табы.

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AccountNavItem } from "@/components/account/accountNav";

export type { AccountNavItem } from "@/components/account/accountNav";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Badge({ n }: { n?: number }) {
  if (!n) return null;
  return (
    <span className="ml-auto rounded-pill bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
      {n}
    </span>
  );
}

export function AccountShell({
  title, items, children,
}: {
  title: string;
  items: AccountNavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <h1 className="font-display text-2xl font-bold">{title}</h1>

      {/* Mobile: табы горизонтальной прокруткой */}
      <nav aria-label="Разделы" className="mt-4 flex items-stretch gap-1 overflow-x-auto border-b border-border md:hidden">
        {items.map((it) => (
          <Fragment key={it.href}>
            {it.separatorBefore && (
              <span role="separator" aria-orientation="vertical" className="mx-1 my-2 w-px shrink-0 self-stretch bg-border" />
            )}
            <Link
              href={it.href as never}
              className={`flex items-center gap-1 whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
                isActive(pathname, it.href)
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {it.label}
              <Badge n={it.badge} />
            </Link>
          </Fragment>
        ))}
      </nav>

      <div className="mt-5 md:grid md:grid-cols-[200px_1fr] md:gap-8">
        {/* Desktop: сайдбар */}
        <aside className="hidden md:block">
          <nav aria-label="Разделы" className="sticky top-20 flex flex-col gap-1">
            {items.map((it) => (
              <Fragment key={it.href}>
                {it.separatorBefore && <hr role="separator" className="my-2 border-border" />}
                <Link
                  href={it.href as never}
                  className={`flex items-center rounded-md px-3 py-2 text-sm ${
                    isActive(pathname, it.href)
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  {it.label}
                  <Badge n={it.badge} />
                </Link>
              </Fragment>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

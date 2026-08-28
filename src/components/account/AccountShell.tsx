"use client";

// Каркас личных зон (кабинет, админка). С identity зона открывается
// «шапкой-героем»: обложка профиля уезжает под стеклянный хедер, на неё
// наезжает аватар, рядом имя, статус и метрики. Ниже — сетка: слева сайдбар
// с навигацией, справа содержимое. На мобайле /cabinet — хаб-оглавление, а в
// подразделах у заголовка появляется кнопка назад. Без identity (админка)
// остаётся старая раскладка: лента разделов на мобайле, сайдбар на десктопе.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft, ClipboardList, Bell, Package, CalendarDays, User, LogOut, Zap,
} from "lucide-react";
import { Brackets } from "@/components/brand/Brackets";
import { useSignOut } from "@/components/auth/useSignOut";
import { ProfileCover } from "@/components/account/ProfileCover";
import { CoverPickerButton } from "@/components/account/CoverPicker";
import { AccountHero } from "@/components/account/AccountHero";
import { CabinetHub } from "@/components/account/CabinetHub";
import type { AccountNavGroup, AccountNavIcon } from "@/components/account/accountNav";
import { ACCOUNT_COVER_HEIGHT, type AccountIdentity } from "@/components/account/identity";

const ICONS: Record<AccountNavIcon, typeof User> = {
  summary: Zap,
  requests: ClipboardList,
  inbox: Bell,
  listings: Package,
  calendar: CalendarDays,
  profile: User,
};

export type { AccountNavGroup, AccountNavItem } from "@/components/account/accountNav";
export type { AccountIdentity } from "@/components/account/identity";

function isActive(pathname: string, item: { href: string; exact?: boolean }): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function Badge({ n }: { n?: number }) {
  if (!n) return null;
  return (
    <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-accent px-1.5 text-2xs font-bold text-accent-foreground">
      {n}
    </span>
  );
}

export function AccountShell({
  groups, identity, children,
}: {
  groups: AccountNavGroup[];
  identity?: AccountIdentity | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const flat = groups.flatMap((g) => g.items);
  // Заголовок — это раздел, в котором стоишь. Отдельное слово «Кабинет» ничего
  // не добавляло: и так видно, где ты, по подсвеченному пункту сайдбара.
  const currentItem = flat.find((it) => isActive(pathname, it));
  const CurrentIcon = currentItem?.icon ? ICONS[currentItem.icon] : null;
  const signOut = useSignOut();

  // «Ждут ответа» в герое — тот же счётчик, что и бейдж на входящих заявках:
  // источник один, второй раз в БД не ходим.
  const pendingCount = flat.find((it) => it.icon === "inbox")?.badge ?? 0;
  // Мобильный хаб живёт только на «Сводке»; в подразделах — кнопка назад.
  const isHub = identity != null && pathname === "/cabinet";

  return (
    <div>
      {/* Обложка на всю ширину, уезжает под плавающую панель хедера (она sticky
        * и остаётся сверху) — тем же приёмом, что герой главной. На мобайле
        * показывается только на хабе — в подразделах ей делать нечего.
        * z-10 кнопке: полоса героя наезжает на обложку отрицательным отступом
        * и иначе перекрывала бы нижнюю половину кнопки. */}
      {identity && (
        <ProfileCover
          src={identity.coverUrl}
          className={`${ACCOUNT_COVER_HEIGHT} -mt-[var(--header-total)] ${isHub ? "" : "max-md:hidden"}`}
        >
          <CoverPickerButton
            me={identity}
            pendingCount={pendingCount}
            className="absolute bottom-4 right-4 z-10 md:bottom-5 md:right-6"
          />
        </ProfileCover>
      )}

      <div className={`mx-auto w-full max-w-6xl px-4 pb-6 ${identity ? "" : "pt-6"}`}>
        {identity && <AccountHero me={identity} pendingCount={pendingCount} />}
        {identity && isHub && (
          <CabinetHub me={identity} groups={groups} icons={ICONS} signOut={signOut} />
        )}

        {/* Без identity (админка) разделы на мобайле по-прежнему едут лентой. */}
        {!identity && (
          <nav
            aria-label="Разделы"
            className="-mx-4 mb-4 flex items-stretch gap-1 overflow-x-auto px-4 md:hidden"
          >
            {flat.map((it) => (
              <Link
                key={it.href}
                href={it.href as never}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-sm px-3 py-2 text-sm ${
                  isActive(pathname, it)
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {it.icon && (() => {
                  const Icon = ICONS[it.icon];
                  return <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />;
                })()}
                {it.label}
                <Badge n={it.badge} />
              </Link>
            ))}
          </nav>
        )}

        <div className={`md:grid md:grid-cols-[250px_1fr] md:items-start md:gap-5 ${identity ? "md:mt-6" : ""}`}>
          <aside className="hidden md:sticky md:top-20 md:flex md:flex-col md:gap-3.5">
            <nav aria-label="Разделы" className="surface flex flex-col gap-0.5 p-2">
              {groups.map((group) => (
                <div key={group.title} className="flex flex-col gap-0.5">
                  <span className="px-3 pb-1 pt-2.5 font-mono text-2xs uppercase tracking-mono text-muted-foreground">
                    {group.title}
                  </span>
                  {group.items.map((it) => {
                    const active = isActive(pathname, it);
                    const Icon = it.icon ? ICONS[it.icon] : null;
                    return (
                      <Link
                        key={it.href}
                        href={it.href as never}
                        className={`flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors ${
                          active
                            ? "bg-muted font-medium text-foreground"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        }`}
                      >
                        {Icon && (
                          <Icon
                            className={`h-4 w-4 shrink-0 ${active ? "text-accent" : ""}`}
                            aria-hidden="true"
                          />
                        )}
                        <span className="min-w-0 flex-1 truncate">{it.label}</span>
                        <Badge n={it.badge} />
                      </Link>
                    );
                  })}
                </div>
              ))}

              {identity && (
                <button
                  type="button"
                  disabled={signOut.pending}
                  onClick={signOut.run}
                  className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-60"
                >
                  <span className="flex w-4 shrink-0 justify-center">
                    {signOut.pending
                      ? <Brackets size={12} running className="text-current" />
                      : <LogOut className="h-4 w-4" aria-hidden="true" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {signOut.pending ? "Выходим…" : "Выйти"}
                  </span>
                </button>
              )}
            </nav>
          </aside>

          <div className="min-w-0">
            {currentItem && (
              <h1 className={`mb-4 flex items-center gap-2.5 font-display text-2xl font-bold ${identity ? "max-md:mt-4" : ""} ${isHub ? "max-md:mt-6" : ""}`}>
                {/* Ленты табов на мобайле больше нет — назад ведёт кнопка у
                  * заголовка: обычно туда, откуда пришли, а без истории (по
                  * прямой ссылке) — в кабинет. На хабе и десктопе её нет. */}
                {identity && !isHub && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.history.length > 1) router.back();
                      else router.push("/cabinet" as never);
                    }}
                    aria-label="Назад"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground md:hidden"
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
                {CurrentIcon && (
                  <CurrentIcon className="h-6 w-6 shrink-0 text-accent" aria-hidden="true" />
                )}
                {currentItem.label}
              </h1>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

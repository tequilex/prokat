"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ClipboardList, Plus, User } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

/* Мобильная навигация: парящая пилюля внизу экрана — зеркалит стеклянные
 * пилюли шапки. Пять пунктов, как в брендбуке, но «Чаты» заменены на
 * «Заявки»: переписки в продукте ещё нет, а заявки — центральный флоу.
 *
 * Скобки работают пиктограммой только здесь («Мои вещи») — в остальных местах
 * это знак. Прочие иконки нейтральные, чтобы бренд не спорил с навигацией. */
export function TabBar({
  placeHref,
  user,
}: {
  placeHref: string;
  user: { name: string | null; username: string | null; image: string | null } | null;
}) {
  const pathname = usePathname();
  const isOn = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const itemClass = (on: boolean) =>
    cn(
      "flex min-h-[44px] min-w-12 flex-col items-center justify-center gap-1 text-xs leading-none",
      on ? "text-primary" : "text-muted-foreground",
    );

  const myItems = isOn("/cabinet/listings");
  const requests = isOn("/requests");
  const profile = isOn("/profile");

  return (
    <nav
      aria-label="Основная навигация"
      data-tabbar
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="glass mx-auto flex max-w-[420px] items-center justify-between gap-2 rounded-[22px] px-4 py-1.5">
        <Link href={"/search" as never} className={itemClass(isOn("/search"))}>
          <Search className="h-[22px] w-[22px]" aria-hidden="true" />
          Поиск
        </Link>

        <Link href={"/cabinet/listings" as never} className={itemClass(myItems)}>
          <span className="flex h-[22px] items-center">
            <Logo
              size={20}
              showWord={false}
              bracketClassName={myItems ? "border-accent" : "border-muted-foreground"}
            />
          </span>
          Мои вещи
        </Link>

        <Link
          href={placeHref as never}
          className="flex min-h-[44px] min-w-12 flex-col items-center justify-center gap-1 text-xs leading-none text-muted-foreground"
        >
          {/* Круг держим вровень со строкой иконок, иначе колонка «Сдать»
           * оказывается выше остальных и тянет за собой всю панель. */}
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" aria-hidden="true" />
          </span>
          Сдать
        </Link>

        <Link href={"/requests" as never} className={itemClass(requests)}>
          <ClipboardList className="h-[22px] w-[22px]" aria-hidden="true" />
          Заявки
        </Link>

        <Link
          href={(user ? "/profile" : "/login") as never}
          className={itemClass(profile)}
        >
          {user ? (
            <Avatar src={user.image} name={user.name} username={user.username} size={22} />
          ) : (
            <User className="h-[22px] w-[22px]" aria-hidden="true" />
          )}
          Профиль
        </Link>
      </div>
    </nav>
  );
}

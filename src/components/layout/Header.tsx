import Link from "next/link";
import { Plus } from "lucide-react";
import { content } from "@theme/content";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/providers/ThemeToggle";
import { auth } from "@/lib/auth";
import { getActiveCities } from "@/server/catalog";
import { UserMenu } from "@/components/auth/UserMenu";
import { CitySelector } from "./CitySelector";
import { HeaderSearch } from "./HeaderSearch";

export async function Header() {
  const [session, cities] = await Promise.all([auth(), getActiveCities()]);
  const user = session?.user;
  // Аноним → /login; авторизованный без username → /welcome (гейт онбординга);
  // иначе прямиком в создание объявления.
  const placeHref = !user ? "/login" : user.username ? "/cabinet/listings/new" : "/welcome";

  return (
    // Прозрачный sticky-контейнер: сами блоки «парят» стеклянными пилюлями над
    // прокручивающимся контентом (backdrop-blur внутри .glass).
    <header className="sticky top-0 z-40 w-full">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-2.5 px-4 py-3 md:flex-nowrap md:gap-3">
        {/* Бренд + город — одна пилюля */}
        <div className="glass order-1 flex h-12 items-center gap-3 rounded-pill pl-5 pr-3">
          <Link
            href="/"
            className="font-display text-lg font-semibold text-primary"
          >
            {content.site.name}
          </Link>
          <span className="h-5 w-px bg-border" aria-hidden="true" />
          <CitySelector cities={cities.map((c) => ({ slug: c.slug, name: c.name }))} />
        </div>

        {/* Поиск: на десктопе тянется в середине (flex-1), на мобиле переносится
         * на отдельную строку во всю ширину. */}
        <HeaderSearch className="order-3 w-full md:order-2 md:w-auto md:flex-1" />

        {/* Разместить — акцентная зелёная пилюля */}
        <Button
          asChild
          className="order-2 ml-auto h-12 rounded-pill px-5 shadow-[var(--glass-shadow)] md:order-3 md:ml-0"
        >
          <Link href={placeHref as never} aria-label={content.nav.place}>
            <Plus className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
            <span className="hidden sm:inline">{content.nav.place}</span>
          </Link>
        </Button>

        {/* Действия — одна стеклянная пилюля: тема + профиль/вход */}
        <div className="glass order-2 flex h-12 items-center gap-1 rounded-pill px-1.5 md:order-4">
          <ThemeToggle />
          {user?.username ? (
            <UserMenu
              username={user.username}
              name={user.name ?? null}
              image={user.image ?? null}
              isAdmin={user.role === "admin"}
            />
          ) : (
            <Button asChild variant="ghost" size="sm" className="rounded-pill">
              <Link href={user ? "/welcome" : "/login"}>
                {user ? content.auth.chooseUsername : content.nav.login}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

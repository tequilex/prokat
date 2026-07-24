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
      <div className="mx-auto max-w-[1200px] px-4 py-3">
        {/* Мобайл: две строки (бренд+действия / поиск). Десктоп: один ряд —
         * обёртка строки-1 схлопывается через md:contents, и её дети встают в
         * общий flex-row по md:order. */}
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
          <div className="flex min-w-0 items-center gap-2.5 md:contents">
            {/* Бренд + город — одна пилюля (ужимается на узких экранах) */}
            <div className="glass flex h-12 min-w-0 items-center gap-3 rounded-pill pl-5 pr-3 md:order-1">
              <Link
                href="/"
                className="shrink-0 font-display text-lg font-semibold text-primary"
              >
                {content.site.name}
              </Link>
              <span className="h-5 w-px shrink-0 bg-border" aria-hidden="true" />
              <CitySelector cities={cities.map((c) => ({ slug: c.slug, name: c.name }))} />
            </div>

            {/* Разместить + действия — единый блок, всегда в одной строке справа */}
            <div className="ml-auto flex shrink-0 items-center gap-2.5 md:order-3 md:ml-0 md:contents">
              <Button
                asChild
                className="h-12 shrink-0 rounded-pill px-5 shadow-[var(--glass-shadow)] md:order-3"
              >
                <Link href={placeHref as never} aria-label={content.nav.place}>
                  <Plus className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
                  <span className="hidden sm:inline">{content.nav.place}</span>
                </Link>
              </Button>

              {/* Действия — одна стеклянная пилюля: тема + профиль/вход */}
              <div className="glass flex h-12 shrink-0 items-center gap-1 rounded-pill px-1.5 md:order-4">
                {/* Тема скрыта на маленьких экранах — там она следует за системной */}
                <div className="hidden sm:block">
                  <ThemeToggle />
                </div>
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
          </div>

          {/* Поиск: десктоп — в середине (flex-1); мобайл — отдельной строкой. */}
          <HeaderSearch className="w-full md:order-2 md:w-auto md:flex-1" />
        </div>
      </div>
    </header>
  );
}

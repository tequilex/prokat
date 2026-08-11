import Link from "next/link";
import { Plus } from "lucide-react";
import { content } from "@theme/content";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { authPanelProps } from "@/lib/auth/panel-props";
import { LoginTrigger } from "@/components/auth/LoginTrigger";
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

  // Флаги для модалки входа: аноним входит, не уходя со страницы.
  const authProps = authPanelProps();

  return (
    // Прозрачный sticky-контейнер: сами блоки «парят» стеклянными пилюлями над
    // прокручивающимся контентом (backdrop-blur внутри .glass).
    <header className="sticky top-0 z-40 w-full">
      <div className="mx-auto max-w-[1200px] px-4 py-3">
        {/* Мобайл: один ряд — бренд с городом и поиск. «Разместить», профиль и
         * тема оттуда убраны: их место внизу, в таб-баре. Десктоп: тот же ряд,
         * плюс действия справа, порядок задаётся через md:order. */}
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex min-w-0 items-center gap-2.5 md:contents">
            {/* На мобайле в пилюле только знак: город переехал в ленту фильтров
             * первым чипом, и поиск получает всю освободившуюся ширину. */}
            <div className="glass flex h-12 shrink-0 items-center gap-2 rounded-pill px-4 md:min-w-0 md:gap-3 md:pl-5 md:pr-3 md:order-1">
              {/* flex, а не просто shrink-0: знак — inline-flex, и внутри
               * строки он садится на baseline с пустотой под ним, из-за чего
               * пилюля центрирует ссылку вместе с этим «хвостом». */}
              <Link href="/" className="flex shrink-0 items-center" aria-label={content.site.name}>
                <Logo size={20} word={content.site.name} />
              </Link>
              <span className="hidden h-5 w-px shrink-0 bg-border md:block" aria-hidden="true" />
              <div className="hidden md:block">
                <CitySelector cities={cities.map((c) => ({ slug: c.slug, name: c.name }))} />
              </div>
            </div>

            {/* Разместить + действия: на мобайле их роль берёт таб-бар — «Сдать»,
             * «Профиль», а переключатель темы живёт в подвале. */}
            <div className="hidden md:order-3 md:contents">
              <Button
                asChild
                className="h-12 shrink-0 rounded-pill px-5 shadow-[var(--glass-shadow)] md:order-3"
              >
                {/* Анониму «Разместить» открывает вход модалкой и возвращает
                  * на ту же страницу; остальным — обычная ссылка. */}
                {user ? (
                  <Link href={placeHref as never} aria-label={content.nav.place}>
                    <Plus className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
                    <span className="hidden sm:inline">{content.nav.place}</span>
                  </Link>
                ) : (
                  <LoginTrigger {...authProps} aria-label={content.nav.place}>
                    <Plus className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
                    <span className="hidden sm:inline">{content.nav.place}</span>
                  </LoginTrigger>
                )}
              </Button>

              {/* Профиль или вход. Тема переехала в меню пользователя, у анонима
                * она остаётся в подвале. */}
              <div className="glass flex h-12 shrink-0 items-center gap-1 rounded-pill px-1.5 md:order-4">
                {user?.username ? (
                  <UserMenu
                    username={user.username}
                    name={user.name ?? null}
                    image={user.image ?? null}
                    isAdmin={user.role === "admin"}
                  />
                ) : (
                  <Button asChild variant="ghost" size="sm" className="rounded-pill">
                    {user ? (
                      <Link href="/welcome">{content.auth.chooseUsername}</Link>
                    ) : (
                      <LoginTrigger {...authProps}>{content.nav.login}</LoginTrigger>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Поиск занимает всё оставшееся место в ряду. */}
          <HeaderSearch className="min-w-0 flex-1 md:order-2" />
        </div>
      </div>
    </header>
  );
}

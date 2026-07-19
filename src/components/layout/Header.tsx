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
    <header className="sticky top-0 z-40 w-full border-b border-border bg-header/95 backdrop-blur supports-[backdrop-filter]:bg-header/90">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 md:h-14 md:flex-nowrap md:py-0">
        <Link href="/" className="font-display text-lg font-semibold text-foreground">
          {content.site.name}
        </Link>

        <CitySelector cities={cities.map((c) => ({ slug: c.slug, name: c.name }))} />

        {/* Поиск: на десктопе — в середине строки (flex-1), на мобиле переносится
         * на отдельную строку во всю ширину. Один инстанс, позиция через order. */}
        <HeaderSearch className="order-last w-full md:order-none md:mx-2 md:max-w-xl md:flex-1" />

        <div className="ml-auto flex items-center gap-1 sm:gap-2 md:order-last">
          <Button asChild size="sm">
            <Link href={placeHref as never} aria-label={content.nav.place}>
              <Plus className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
              <span className="hidden sm:inline">{content.nav.place}</span>
            </Link>
          </Button>

          <ThemeToggle />

          {user?.username ? (
            <UserMenu
              username={user.username}
              name={user.name ?? null}
              image={user.image ?? null}
              isAdmin={user.role === "admin"}
            />
          ) : (
            <Button asChild variant="outline" size="sm">
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

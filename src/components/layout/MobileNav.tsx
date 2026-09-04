import { auth } from "@/lib/auth";
import { authPanelProps } from "@/lib/auth/panel-props";
import { getActiveCities } from "@/server/catalog";
import { TabBar } from "./TabBar";

// Серверная обёртка таб-бара: та же логика «Разместить», что и в Header —
// аноним входит модалкой, остальные идут в создание объявления.
export async function MobileNav() {
  const [session, cities] = await Promise.all([auth(), getActiveCities()]);
  const user = session?.user;
  const placeHref = user ? "/cabinet/listings/new" : "/login";

  const authProps = authPanelProps();

  return (
    <TabBar
      placeHref={placeHref}
      // Город таб-бар выбирает сам: из адреса, а где его там нет — из
      // предпочтения. Здесь его считать нельзя — MobileNav живёт в корневом
      // layout'е и при навигации не перерисовывается.
      cities={cities.map((c) => c.slug)}
      authProps={authProps}
      user={
        user
          ? { name: user.name ?? null, image: user.image ?? null }
          : null
      }
    />
  );
}

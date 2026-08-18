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

  // Город по умолчанию — тот же, что на главной и в /search: первый активный.
  const catalogHref = cities[0] ? `/${cities[0].slug}` : "/";

  const authProps = authPanelProps();

  return (
    <TabBar
      placeHref={placeHref}
      catalogHref={catalogHref}
      authProps={authProps}
      user={
        user
          ? { name: user.name ?? null, image: user.image ?? null }
          : null
      }
    />
  );
}

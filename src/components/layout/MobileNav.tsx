import { auth } from "@/lib/auth";
import { authPanelProps } from "@/lib/auth/panel-props";
import { TabBar } from "./TabBar";

// Серверная обёртка таб-бара: та же логика «Разместить», что и в Header —
// аноним входит модалкой, остальные идут в создание объявления.
export async function MobileNav() {
  const session = await auth();
  const user = session?.user;
  const placeHref = user ? "/cabinet/listings/new" : "/login";

  const authProps = authPanelProps();

  return (
    <TabBar
      placeHref={placeHref}
      authProps={authProps}
      user={
        user
          ? { name: user.name ?? null, image: user.image ?? null }
          : null
      }
    />
  );
}

import { auth } from "@/lib/auth";
import { TabBar } from "./TabBar";

// Серверная обёртка таб-бара: та же логика гейта «Разместить», что и в Header
// (аноним → /login, авторизованный без username → /welcome).
export async function MobileNav() {
  const session = await auth();
  const user = session?.user;
  const placeHref = !user ? "/login" : user.username ? "/cabinet/listings/new" : "/welcome";

  return (
    <TabBar
      placeHref={placeHref}
      user={
        user
          ? { name: user.name ?? null, username: user.username ?? null, image: user.image ?? null }
          : null
      }
    />
  );
}

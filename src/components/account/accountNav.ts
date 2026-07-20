// Единый источник навигации кабинета. Личные табы («я арендую») всегда,
// owner-табы («я сдаю») — только при наличии проката, за разделителем.

export interface AccountNavItem {
  href: string;
  label: string;
  badge?: number;
  separatorBefore?: boolean;
}

export function buildAccountNav(
  { hasProvider, newRequestsCount }: { hasProvider: boolean; newRequestsCount: number },
): AccountNavItem[] {
  const items: AccountNavItem[] = [
    { href: "/requests", label: "Мои заявки" },
    { href: "/profile", label: "Профиль" },
  ];
  if (hasProvider) {
    items.push(
      { href: "/cabinet/requests", label: "Заявки на мои вещи", badge: newRequestsCount, separatorBefore: true },
      { href: "/cabinet/listings", label: "Мои объявления" },
      { href: "/cabinet/calendar", label: "Календарь" },
      { href: "/cabinet/settings", label: "Настройки проката" },
    );
  }
  return items;
}

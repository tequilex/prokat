// Единый источник навигации кабинета. Личные табы («я арендую») и owner-табы
// («я сдаю», за разделителем) доступны любому залогиненному юзеру — отдельной
// роли/сущности «владелец» нет.

export interface AccountNavItem {
  href: string;
  label: string;
  badge?: number;
  separatorBefore?: boolean;
}

export function buildAccountNav(
  { newRequestsCount }: { newRequestsCount: number },
): AccountNavItem[] {
  return [
    { href: "/requests", label: "Мои заявки" },
    { href: "/profile", label: "Профиль" },
    { href: "/cabinet/requests", label: "Заявки на мои вещи", badge: newRequestsCount, separatorBefore: true },
    { href: "/cabinet/listings", label: "Мои объявления" },
    { href: "/cabinet/calendar", label: "Календарь" },
  ];
}

"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { resolveCitySlug } from "@/lib/catalog/current-city";
import { useCityPreference } from "./CityPreference";

// Текущий город — на клиенте, а не в шапке-серверном-компоненте. Шапка живёт в
// корневом layout'е, а он при клиентской навигации не перерисовывается: адрес,
// прочитанный там, протухает на первом же переходе и начинает врать. Клиентские
// компоненты перерисовываются, поэтому адрес берём хуками.
//
// Отдаём и сам адрес: он нужен не только для города, но и для построения ссылок
// смены города.
export function useCurrentCity(knownSlugs: readonly string[]): {
  pathname: string;
  search: string;
  slug: string | undefined;
} {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const { slug: preferred } = useCityPreference();

  // Адрес важнее предпочтения: человек стоит на витрине конкретного города.
  // Где города в адресе нет (главная, кабинет, профиль, поиск без ?city=) —
  // работает предпочтение, тот же самый город, который показывает страница.
  //
  // Предпочтение проверяется по списку активных так же, как адрес: город могли
  // отключить при открытой вкладке, и тогда «Каталог» вёл бы на 404, а поиск
  // уходил бы с ?city= несуществующего города.
  const preferredIfActive = preferred && knownSlugs.includes(preferred) ? preferred : undefined;
  const slug = resolveCitySlug(pathname, search, knownSlugs) ?? preferredIfActive;

  return { pathname, search, slug };
}

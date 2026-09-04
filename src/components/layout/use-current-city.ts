"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { resolveCitySlug } from "@/lib/catalog/current-city";

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

  // На /search без ?city= страница берёт город по умолчанию — первый активный.
  // Шапка обязана назвать тот же, иначе заголовок говорит «Казань», а селектор
  // рядом — «Город». Порядок списка тот же, что у getActiveCities().
  const slug = resolveCitySlug(pathname, search, knownSlugs)
    ?? (pathname === "/search" ? knownSlugs[0] : undefined);

  return { pathname, search, slug };
}

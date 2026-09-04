// Текущий город по адресу страницы. Витрина и категории держат город в пути
// (`/kazan/instrumenty`), поиск — в параметре (`/search?city=kazan`), и шапке
// нужен ответ в обоих случаях: без него поиск из Петербурга уводил бы в город
// по умолчанию, а селектор города не знал бы, что показывать выбранным.
//
// Чистая функция без БД: список активных слагов приходит сверху, оттуда же, где
// его и так грузят для селектора.

export function resolveCitySlug(
  pathname: string,
  search: string,
  knownSlugs: readonly string[],
): string | undefined {
  const known = (slug: string | null | undefined): string | undefined =>
    slug && knownSlugs.includes(slug) ? slug : undefined;

  // Путь важнее параметра: человек физически стоит на витрине города, что бы ни
  // осталось в адресе от прошлого перехода.
  return known(pathname.split("/")[1]) ?? known(new URLSearchParams(search).get("city"));
}

// Куда ведёт выбор города в шапке. С поиска не уводит: переносится то, что
// человек выбрал про себя, — запрос, раздел, сортировка и вид. Не переносятся
// цена, даты и страница: они описывают выдачу покинутого города и в новом
// означали бы уже не то же самое.
export function citySwitchHref(pathname: string, search: string, slug: string): string {
  if (pathname !== "/search") return `/${slug}`;

  const current = new URLSearchParams(search);
  const next = new URLSearchParams();
  for (const key of ["q", "category", "sort", "view"]) {
    const value = current.get(key);
    if (value) next.set(key, value);
  }
  next.set("city", slug);
  return `/search?${next.toString()}`;
}

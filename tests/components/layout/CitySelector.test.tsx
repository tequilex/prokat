import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Адрес компонент берёт хуками, а не пропами: шапка в корневом layout'е при
// навигации не перерисовывается, и запечённый в неё адрес протухал бы.
const url = { pathname: "/", search: "" };
vi.mock("next/navigation", () => ({
  usePathname: () => url.pathname,
  useSearchParams: () => new URLSearchParams(url.search),
}));

// Экшен ходит в куки и в базу — в jsdom его не поднять, а проверяем мы здесь
// не запись куки, а то, какой город назван.
const setCityPreference = vi.hoisted(() => vi.fn());
vi.mock("@/server/actions/city", () => ({ setCityPreference }));

import { CitySelector } from "@/components/layout/CitySelector";
import { CityPreferenceProvider } from "@/components/layout/CityPreference";

const cities = [
  { slug: "msk", name: "Москва" },
  { slug: "spb", name: "Санкт-Петербург" },
];

// Объектом, а не голым аргументом: явный undefined проваливался бы в дефолт, и
// случай «города не выбрано» не проверялся бы вовсе.
function renderSelector({ preferred }: { preferred?: string } = { preferred: "msk" }) {
  return render(
    <CityPreferenceProvider initialSlug={preferred}>
      <CitySelector cities={cities} />
    </CityPreferenceProvider>,
  );
}

describe("CitySelector", () => {
  it("shows the current city name on the trigger", () => {
    url.pathname = "/msk";
    url.search = "";

    renderSelector();

    expect(screen.getByRole("button", { name: /Москва/ })).toBeInTheDocument();
  });

  // Главная показывает ленту выбранного города — селектор обязан назвать тот
  // же. Раньше он писал здесь слово «Город» над казанской выдачей.
  it("names the chosen city on pages that carry no city in the address", () => {
    url.search = "";
    for (const pathname of ["/", "/profile", "/cabinet", "/u/01ARZ3NDEKTSV4RRFFQ69G5FAV"]) {
      url.pathname = pathname;
      const view = renderSelector({ preferred: "spb" });
      expect(screen.getByRole("button", { name: /Санкт-Петербург/ }), pathname).toBeInTheDocument();
      view.unmount();
    }
  });

  // Адрес важнее выбора: человек физически стоит на витрине другого города.
  it("prefers the city of the address over the chosen one", () => {
    url.pathname = "/spb";
    url.search = "";

    renderSelector({ preferred: "msk" });

    expect(screen.getByRole("button", { name: /Санкт-Петербург/ })).toBeInTheDocument();
  });

  it("reads the city from ?city= on the search page", () => {
    url.pathname = "/search";
    url.search = "city=spb";

    renderSelector({ preferred: "msk" });

    expect(screen.getByRole("button", { name: /Санкт-Петербург/ })).toBeInTheDocument();
  });

  // Страница поиска без ?city= показывает выбранный город — селектор обязан
  // назвать тот же, иначе он спорит с заголовком страницы.
  it("names the chosen city on a bare search page", () => {
    url.pathname = "/search";
    url.search = "";

    renderSelector({ preferred: "msk" });

    expect(screen.getByRole("button", { name: /Москва/ })).toBeInTheDocument();
  });

  // Единственный оставшийся случай для плашки-заглушки: активных городов нет
  // вовсе, называть нечего.
  it("falls back to «Город» when nothing is chosen", () => {
    url.pathname = "/";
    url.search = "";

    renderSelector({});

    expect(screen.getByRole("button", { name: /Город/ })).toBeInTheDocument();
  });
});

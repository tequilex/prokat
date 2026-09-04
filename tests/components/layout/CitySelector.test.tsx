import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Адрес компонент берёт хуками, а не пропами: шапка в корневом layout'е при
// навигации не перерисовывается, и запечённый в неё адрес протухал бы.
const url = { pathname: "/", search: "" };
vi.mock("next/navigation", () => ({
  usePathname: () => url.pathname,
  useSearchParams: () => new URLSearchParams(url.search),
}));

import { CitySelector } from "@/components/layout/CitySelector";

const cities = [
  { slug: "msk", name: "Москва" },
  { slug: "spb", name: "Санкт-Петербург" },
];

describe("CitySelector", () => {
  it("shows the current city name on the trigger", () => {
    url.pathname = "/msk";
    url.search = "";

    render(<CitySelector cities={cities} />);

    expect(screen.getByRole("button", { name: /Москва/ })).toBeInTheDocument();
  });

  it("falls back to «Город» when the page has no city", () => {
    url.pathname = "/";
    url.search = "";

    render(<CitySelector cities={cities} />);

    expect(screen.getByRole("button", { name: /Город/ })).toBeInTheDocument();
  });

  it("reads the city from ?city= on the search page", () => {
    url.pathname = "/search";
    url.search = "city=spb";

    render(<CitySelector cities={cities} />);

    expect(screen.getByRole("button", { name: /Санкт-Петербург/ })).toBeInTheDocument();
  });

  // Страница поиска без ?city= показывает первый активный город — селектор
  // обязан назвать тот же, иначе он спорит с заголовком страницы.
  it("names the default city on a bare search page", () => {
    url.pathname = "/search";
    url.search = "";

    render(<CitySelector cities={cities} />);

    expect(screen.getByRole("button", { name: /Москва/ })).toBeInTheDocument();
  });
});

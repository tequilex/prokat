import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const push = vi.fn();
const url = { pathname: "/", search: "" };
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => url.pathname,
  useSearchParams: () => new URLSearchParams(url.search),
}));

import { HeaderSearch } from "@/components/layout/HeaderSearch";

const CITIES = ["kazan", "spb"];

const submit = (query?: string) => {
  if (query !== undefined) {
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: query } });
  }
  fireEvent.submit(screen.getByRole("search"));
};

describe("HeaderSearch", () => {
  it("navigates to /search with the query on submit", () => {
    url.pathname = "/";
    url.search = "";

    render(<HeaderSearch />);
    submit("дрель");

    expect(push).toHaveBeenCalledWith("/search?q=%D0%B4%D1%80%D0%B5%D0%BB%D1%8C");
  });

  // Без города поиск уводил бы в город по умолчанию: листающий Петербург
  // получал бы выдачу Казани.
  it("carries the city of the page you are searching from", () => {
    url.pathname = "/spb/instrumenty";
    url.search = "";

    render(<HeaderSearch cities={CITIES} />);
    submit("дрель");

    expect(push).toHaveBeenCalledWith("/search?q=%D0%B4%D1%80%D0%B5%D0%BB%D1%8C&city=spb");
  });

  it("keeps the city already chosen on the search page", () => {
    url.pathname = "/search";
    url.search = "q=old&city=spb";

    render(<HeaderSearch cities={CITIES} />);
    submit("дрель");

    expect(push).toHaveBeenCalledWith("/search?q=%D0%B4%D1%80%D0%B5%D0%BB%D1%8C&city=spb");
  });

  // Первый сегмент пути городом быть не обязан.
  it("does not mistake a non-city route for a city", () => {
    url.pathname = "/cabinet/listings";
    url.search = "";

    render(<HeaderSearch cities={CITIES} />);
    submit("дрель");

    expect(push).toHaveBeenCalledWith("/search?q=%D0%B4%D1%80%D0%B5%D0%BB%D1%8C");
  });

  it("keeps the city even when the query is empty", () => {
    url.pathname = "/spb";
    url.search = "";

    render(<HeaderSearch cities={CITIES} />);
    submit();

    expect(push).toHaveBeenCalledWith("/search?city=spb");
  });
});

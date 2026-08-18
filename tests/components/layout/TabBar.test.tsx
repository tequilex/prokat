import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TabBar } from "@/components/layout/TabBar";

const AUTH = { nextAuthProviders: ["yandex"], vkEnabled: true, canRegisterByEmail: true };

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

const user = { name: "Марина", image: null };

describe("TabBar", () => {
  it("renders all five destinations", () => {
    pathname.current = "/";
    render(<TabBar authProps={AUTH} placeHref="/cabinet/listings/new" catalogHref="/kazan" user={user} />);
    for (const label of ["Каталог", "Мои вещи", "Сдать", "Заявки", "Кабинет"]) {
      expect(screen.getByRole("link", { name: new RegExp(label) })).toBeInTheDocument();
    }
    // Каталог — это витрина города, а не пустой /search.
    expect(screen.getByRole("link", { name: /Каталог/ })).toHaveAttribute("href", "/kazan");
  });

  // У анонима закрытые вкладки открывают вход модалкой. Ссылка остаётся
  // запасным путём (без JS, ctrl-клик) и несёт ?from= — куда вернуть после входа.
  it("sends anonymous visitors to login, remembering where they were heading", () => {
    pathname.current = "/";
    render(<TabBar authProps={AUTH} placeHref="/login" catalogHref="/kazan" user={null} />);
    expect(screen.getByRole("link", { name: /Кабинет/ })).toHaveAttribute("href", "/login?from=%2Fcabinet");
    expect(screen.getByRole("link", { name: /Заявки/ })).toHaveAttribute("href", "/login?from=%2Frequests");
    expect(screen.getByRole("link", { name: /Мои вещи/ })).toHaveAttribute("href", "/login?from=%2Fcabinet%2Flistings");
  });

  it("marks the section containing the current path as active", () => {
    pathname.current = "/cabinet/listings/new";
    render(<TabBar authProps={AUTH} placeHref="/cabinet/listings/new" catalogHref="/kazan" user={user} />);
    expect(screen.getByRole("link", { name: /Мои вещи/ })).toHaveClass("text-primary");
    expect(screen.getByRole("link", { name: /Заявки/ })).toHaveClass("text-muted-foreground");
    // «Мои вещи» лежат внутри /cabinet — «Кабинет» не должен подсвечиваться заодно.
    expect(screen.getByRole("link", { name: /Кабинет/ })).toHaveClass("text-muted-foreground");
  });

  it("keeps the cabinet tab lit across its subsections", () => {
    for (const path of ["/cabinet", "/cabinet/requests", "/cabinet/calendar", "/profile"]) {
      pathname.current = path;
      const view = render(<TabBar authProps={AUTH} placeHref="/cabinet/listings/new" catalogHref="/kazan" user={user} />);
      expect(screen.getByRole("link", { name: /Кабинет/ }), path).toHaveClass("text-primary");
      view.unmount();
    }
  });

  it("lights the catalog tab inside the city and its categories", () => {
    for (const path of ["/kazan", "/kazan/instrumenty", "/kazan/instrumenty/sadovaya-tekhnika"]) {
      pathname.current = path;
      const view = render(<TabBar authProps={AUTH} placeHref="/cabinet/listings/new" catalogHref="/kazan" user={user} />);
      expect(screen.getByRole("link", { name: /Каталог/ }), path).toHaveClass("text-primary");
      view.unmount();
    }
  });
});

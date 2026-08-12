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
    render(<TabBar authProps={AUTH} placeHref="/cabinet/listings/new" user={user} />);
    for (const label of ["Поиск", "Мои вещи", "Сдать", "Заявки", "Профиль"]) {
      expect(screen.getByRole("link", { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  // У анонима закрытые вкладки открывают вход модалкой. Ссылка остаётся
  // запасным путём (без JS, ctrl-клик) и несёт ?from= — куда вернуть после входа.
  it("sends anonymous visitors to login, remembering where they were heading", () => {
    pathname.current = "/";
    render(<TabBar authProps={AUTH} placeHref="/login" user={null} />);
    expect(screen.getByRole("link", { name: /Профиль/ })).toHaveAttribute("href", "/login?from=%2Fprofile");
    expect(screen.getByRole("link", { name: /Заявки/ })).toHaveAttribute("href", "/login?from=%2Frequests");
    expect(screen.getByRole("link", { name: /Мои вещи/ })).toHaveAttribute("href", "/login?from=%2Fcabinet%2Flistings");
  });

  it("marks the section containing the current path as active", () => {
    pathname.current = "/cabinet/listings/new";
    render(<TabBar authProps={AUTH} placeHref="/cabinet/listings/new" user={user} />);
    expect(screen.getByRole("link", { name: /Мои вещи/ })).toHaveClass("text-primary");
    expect(screen.getByRole("link", { name: /Заявки/ })).toHaveClass("text-muted-foreground");
  });
});

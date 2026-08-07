import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TabBar } from "@/components/layout/TabBar";

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

const user = { name: "Марина", username: "marina", image: null };

describe("TabBar", () => {
  it("renders all five destinations", () => {
    pathname.current = "/";
    render(<TabBar placeHref="/cabinet/listings/new" user={user} />);
    for (const label of ["Поиск", "Мои вещи", "Сдать", "Заявки", "Профиль"]) {
      expect(screen.getByRole("link", { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  it("sends anonymous visitors to login instead of the profile", () => {
    pathname.current = "/";
    render(<TabBar placeHref="/login" user={null} />);
    expect(screen.getByRole("link", { name: /Профиль/ })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: /Сдать/ })).toHaveAttribute("href", "/login");
  });

  it("marks the section containing the current path as active", () => {
    pathname.current = "/cabinet/listings/new";
    render(<TabBar placeHref="/cabinet/listings/new" user={user} />);
    expect(screen.getByRole("link", { name: /Мои вещи/ })).toHaveClass("text-primary");
    expect(screen.getByRole("link", { name: /Заявки/ })).toHaveClass("text-muted-foreground");
  });
});

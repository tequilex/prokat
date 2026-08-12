import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/requests" }));

import { AccountShell } from "@/components/account/AccountShell";

const groups = [
  { title: "я арендую", items: [{ href: "/requests", label: "Мои заявки" }] },
  { title: "мои вещи", items: [{ href: "/cabinet/listings", label: "Мои объявления" }] },
];

const identity = {
  name: "Марина",
  email: "marina@ya.ru",
  image: null,
  isVerified: true,
  activeListings: 3,
  deals: 12,
};

describe("AccountShell", () => {
  it("shows group titles above their sections", () => {
    render(<AccountShell groups={groups}>x</AccountShell>);
    expect(screen.getByText("я арендую")).toBeInTheDocument();
    expect(screen.getByText("мои вещи")).toBeInTheDocument();
  });

  it("titles the page with the section you are standing in", () => {
    render(<AccountShell groups={groups}>x</AccountShell>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Мои заявки");
  });

  it("puts the person and their counts above the navigation", () => {
    render(<AccountShell groups={groups} identity={identity}>x</AccountShell>);
    expect(screen.getByText("Марина")).toBeInTheDocument();
    expect(screen.getByText("marina@ya.ru")).toBeInTheDocument();
    expect(screen.getByText("3 объявления")).toBeInTheDocument();
    expect(screen.getByText("12 аренд")).toBeInTheDocument();
    expect(screen.getByText("Проверенный продавец")).toBeInTheDocument();
  });

  it("offers a way out on both layouts — the header menu is hidden on mobile", () => {
    render(<AccountShell groups={groups} identity={identity}>x</AccountShell>);
    expect(screen.getAllByRole("button", { name: /Выйти/ })).toHaveLength(2);
  });

  it("omits the identity card when there is nobody to show", () => {
    render(<AccountShell groups={groups}>x</AccountShell>);
    expect(screen.queryByText("Проверенный продавец")).toBeNull();
  });
});

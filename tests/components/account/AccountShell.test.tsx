import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Путь задаётся из теста: хаб и кнопка «назад» зависят от того, где стоишь.
const nav = vi.hoisted(() => ({ pathname: "/requests" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ refresh: vi.fn() }),
}));

// Кнопка смены обложки тянет server action, а тот — весь стек auth: под jsdom
// он не собирается, да и тестируем здесь разметку каркаса, а не сохранение.
vi.mock("@/server/actions/profile", () => ({ updateCover: vi.fn() }));

import { AccountShell } from "@/components/account/AccountShell";

const groups = [
  { title: "я арендую", items: [{ href: "/requests", label: "Мои заявки" }] },
  { title: "мои вещи", items: [{ href: "/cabinet/listings", label: "Мои объявления" }] },
];

const identity = {
  name: "Марина",
  email: "marina@ya.ru",
  image: null,
  coverUrl: null,
  isVerified: true,
  activeListings: 3,
  deals: 12,
  upcomingBookings: 2,
  pendingMine: 1,
};

describe("AccountShell", () => {
  it("shows group titles above their sections", () => {
    nav.pathname = "/requests";
    render(<AccountShell groups={groups}>x</AccountShell>);
    expect(screen.getByText("я арендую")).toBeInTheDocument();
    expect(screen.getByText("мои вещи")).toBeInTheDocument();
  });

  it("titles the page with the section you are standing in", () => {
    nav.pathname = "/requests";
    render(<AccountShell groups={groups}>x</AccountShell>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Мои заявки");
  });

  it("puts the person and their counts into the hero, not the sidebar", () => {
    nav.pathname = "/requests";
    render(<AccountShell groups={groups} identity={identity}>x</AccountShell>);
    expect(screen.getByText("Марина")).toBeInTheDocument();
    expect(screen.getByText("marina@ya.ru")).toBeInTheDocument();
    expect(screen.getByText("объявления")).toBeInTheDocument();
    expect(screen.getByText("аренд")).toBeInTheDocument();
    expect(screen.getByText("Проверенный продавец")).toBeInTheDocument();
  });

  it("renders no cover image until the person uploads one", () => {
    nav.pathname = "/requests";
    render(<AccountShell groups={groups} identity={identity}>x</AccountShell>);
    expect(document.querySelector("img")).toBeNull();
  });

  it("shows the mobile hub only on the cabinet summary", () => {
    nav.pathname = "/cabinet";
    render(
      <AccountShell
        groups={[{ title: "сейчас", items: [{ href: "/cabinet", label: "Сводка", exact: true }] }, ...groups]}
        identity={identity}
      >
        x
      </AccountShell>,
    );
    // Хаб дублирует навигацию строками: «Мои заявки» есть в сайдбаре и в хабе.
    expect(screen.getAllByRole("link", { name: /Мои заявки/ })).toHaveLength(2);
    expect(screen.queryByRole("link", { name: "В кабинет" })).toBeNull();
  });

  it("offers a way back to the hub from a subsection", () => {
    nav.pathname = "/requests";
    render(<AccountShell groups={groups} identity={identity}>x</AccountShell>);
    expect(screen.getByRole("link", { name: "В кабинет" })).toHaveAttribute("href", "/cabinet");
  });

  it("offers a way out in the sidebar and in the hub", () => {
    nav.pathname = "/cabinet";
    render(
      <AccountShell
        groups={[{ title: "сейчас", items: [{ href: "/cabinet", label: "Сводка", exact: true }] }, ...groups]}
        identity={identity}
      >
        x
      </AccountShell>,
    );
    expect(screen.getAllByRole("button", { name: /Выйти/ })).toHaveLength(2);
  });

  it("keeps the plain layout when there is nobody to show", () => {
    nav.pathname = "/requests";
    render(<AccountShell groups={groups}>x</AccountShell>);
    expect(screen.queryByText("Проверенный продавец")).toBeNull();
    expect(screen.queryByRole("link", { name: "В кабинет" })).toBeNull();
  });
});

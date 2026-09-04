import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));
// Header renders HeaderSearch and CitySelector: both read the URL with client
// hooks, and useRouter() is called at render — without mocks jsdom throws
// "invariant expected app router to be mounted".
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(""),
}));
// City row is untyped in the mock: only slug/name are read; no need to satisfy the
// full City type (real rows have more columns).
vi.mock("@/server/catalog", () => ({
  getActiveCities: vi.fn(async () => [{ id: "1", slug: "msk", name: "Москва" }]),
}));

import { Header } from "@/components/layout/Header";

describe("Header", () => {
  it("renders search, city selector, place CTA and login for anon", async () => {
    render(await Header());
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Город/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Разместить/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Войти/ })).toBeInTheDocument();
  });
});

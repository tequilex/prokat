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

// Экшен выбора города ходит в куки и в базу — в jsdom его не поднять.
vi.mock("@/server/actions/city", () => ({ setCityPreference: vi.fn() }));

import { Header } from "@/components/layout/Header";
import { CityPreferenceProvider } from "@/components/layout/CityPreference";

describe("Header", () => {
  it("renders search, city selector, place CTA and login for anon", async () => {
    // Внутри провайдера, как в корневом layout'е: без него шапка не знала бы
    // города на страницах, где его нет в адресе.
    render(<CityPreferenceProvider initialSlug="msk">{await Header()}</CityPreferenceProvider>);
    expect(screen.getByRole("search")).toBeInTheDocument();
    // Именно название города, а не заглушка «Город»: на «/» города в адресе
    // нет, и раньше здесь стояло слово «Город» над выдачей конкретного города.
    expect(screen.getByRole("button", { name: /Москва/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Разместить/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Войти/ })).toBeInTheDocument();
  });
});

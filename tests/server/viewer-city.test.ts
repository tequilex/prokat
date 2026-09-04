import { describe, it, expect, vi, beforeEach } from "vitest";

// Порядок источников города — правило, а не деталь реализации: витрина обязана
// слушать куку вперёд профиля, а форма объявления — наоборот. Чистый
// pickCitySlug этого не поймает: он проверяет то, что ему передали, а порядок
// задаётся здесь. Поменяй местами две строки в resolveViewerCity — упадёт этот
// тест и только он.

const cookieValue = { current: undefined as string | undefined };
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "city" && cookieValue.current ? { value: cookieValue.current } : undefined) }),
}));

const sessionUserId = { current: "u1" as string | null };
vi.mock("@/lib/auth", () => ({
  auth: async () => (sessionUserId.current ? { user: { id: sessionUserId.current } } : null),
}));

// Города активны оба; порядок — как у getActiveCities (по имени).
const ACTIVE = [
  { id: "c-kzn", slug: "kazan", name: "Казань" },
  { id: "c-spb", slug: "spb", name: "Санкт-Петербург" },
];
const profileSlug = { current: undefined as string | undefined };

vi.mock("@/server/catalog", () => ({
  getActiveCities: async () => ACTIVE,
}));

// Профиль читается прямым запросом; подменяем всю цепочку Drizzle и отдаём то,
// что должен был бы вернуть join users⋈cities.
vi.mock("@/lib/db", () => {
  const chain: unknown = new Proxy({} as Record<string | symbol, unknown>, {
    get(_t, prop) {
      if (prop === "then") {
        return (resolve: (rows: unknown[]) => void) =>
          resolve(profileSlug.current ? [{ slug: profileSlug.current }] : []);
      }
      return () => chain;
    },
  });
  return { getDb: () => chain, getPool: () => ({}) };
});

import { resolveViewerCity, resolveOwnCity } from "@/server/city";

beforeEach(() => {
  cookieValue.current = undefined;
  profileSlug.current = undefined;
  sessionUserId.current = "u1";
});

describe("resolveViewerCity", () => {
  it("prefers the cookie over the profile: it answers where I am looking now", async () => {
    cookieValue.current = "spb";
    profileSlug.current = "kazan";
    expect((await resolveViewerCity())?.slug).toBe("spb");
  });

  it("falls back to my own city when nothing was chosen for browsing", async () => {
    profileSlug.current = "spb";
    expect((await resolveViewerCity())?.slug).toBe("spb");
  });

  it("falls back to the first active city for an anonymous visitor", async () => {
    sessionUserId.current = null;
    expect((await resolveViewerCity())?.slug).toBe("kazan");
  });

  // Кука живёт год и правится руками, город админ отключает в любой момент.
  it("ignores a cookie that is not an active city", async () => {
    cookieValue.current = "atlantida";
    profileSlug.current = "spb";
    expect((await resolveViewerCity())?.slug).toBe("spb");
  });
});

describe("resolveOwnCity", () => {
  // Обратный порядок: вещь лежит там, где человек живёт, а не там, где он
  // сейчас листает чужой город.
  it("prefers my own city over the city being browsed", async () => {
    cookieValue.current = "spb";
    profileSlug.current = "kazan";
    expect((await resolveOwnCity())?.slug).toBe("kazan");
  });

  it("falls back to the browsed city when no own city is set", async () => {
    cookieValue.current = "spb";
    expect((await resolveOwnCity())?.slug).toBe("spb");
  });
});

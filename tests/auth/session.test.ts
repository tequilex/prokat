import { describe, it, expect } from "vitest";
import { _resetEnvCacheForTests } from "@/lib/env";
import {
  safeCallback, sessionCookieName, sessionCookieOptions, sessionTtlSeconds,
} from "@/lib/auth/session";

const baseEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "postgres://app:test@localhost:5432/app",
  NEXTAUTH_URL: "http://localhost",
  NEXTAUTH_SECRET: "x".repeat(32),
};

// Копия хелпера из tests/auth/oauth-vk.test.ts: без восстановления process.env
// переменные текут между файлами внутри одного vitest-воркера.
function withEnv<T>(overrides: Record<string, string>, fn: () => T): T {
  const prev = { ...process.env };
  Object.assign(process.env, baseEnv, overrides);
  _resetEnvCacheForTests();
  try { return fn(); } finally {
    for (const k of Object.keys(process.env)) delete process.env[k];
    Object.assign(process.env, prev);
    _resetEnvCacheForTests();
  }
}

describe("safeCallback", () => {
  it("keeps relative paths", () => {
    expect(safeCallback("/cabinet/listings")).toBe("/cabinet/listings");
  });
  it("rejects protocol-relative and absolute urls", () => {
    expect(safeCallback("//evil.com")).toBe("/");
    expect(safeCallback("https://evil.com")).toBe("/");
    expect(safeCallback(null)).toBe("/");
    expect(safeCallback(undefined)).toBe("/");
  });

  it("отбивает обратный слэш — браузер трактует его как /", () => {
    expect(safeCallback("/\\evil.com")).toBe("/");
    expect(safeCallback("/\\\\evil.com")).toBe("/");
  });

  it("отбивает управляющие символы внутри пути", () => {
    // URL вырезает tab/LF/CR ещё до резолва, поэтому ловим их сами.
    expect(safeCallback("/\tevil.com")).toBe("/");
    expect(safeCallback("/\nevil.com")).toBe("/");
    expect(safeCallback("/\revil.com")).toBe("/");
  });

  it("пропускает нормальный путь со слагом, query и якорем", () => {
    // Дефис в слаге не должен считаться подозрительным — иначе любой возврат
    // на карточку товара схлопнется в корень.
    expect(safeCallback("/kazan/bicycles/trek-01j?from=1#top"))
      .toBe("/kazan/bicycles/trek-01j?from=1#top");
    expect(safeCallback("/nizhniy-novgorod/velosipedy/gorny-velosiped-01j"))
      .toBe("/nizhniy-novgorod/velosipedy/gorny-velosiped-01j");
  });

  it("выбрасывает всё, кроме пути, query и якоря", () => {
    expect(safeCallback("/a/../../b")).toBe("/b");
  });
});

describe("sessionCookieName", () => {
  it("uses the __Secure- prefix on https", () => {
    withEnv({ NEXTAUTH_URL: "https://example.ru" }, () => {
      expect(sessionCookieName()).toBe("__Secure-authjs.session-token");
    });
  });

  it("uses the plain name on http", () => {
    withEnv({ NEXTAUTH_URL: "http://localhost:3000" }, () => {
      expect(sessionCookieName()).toBe("authjs.session-token");
    });
  });
});

describe("sessionCookieOptions", () => {
  it("is httpOnly and lax, secure only on https", () => {
    const expires = new Date(Date.now() + 1000);
    withEnv({ NEXTAUTH_URL: "https://example.ru" }, () => {
      expect(sessionCookieOptions(expires)).toMatchObject({ httpOnly: true, sameSite: "lax", secure: true, path: "/" });
    });
    withEnv({ NEXTAUTH_URL: "http://localhost:3000" }, () => {
      expect(sessionCookieOptions(expires).secure).toBe(false);
    });
  });
});

describe("sessionTtlSeconds", () => {
  it("is 30 days", () => {
    expect(sessionTtlSeconds).toBe(30 * 24 * 60 * 60);
  });
});

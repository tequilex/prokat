import { describe, it, expect } from "vitest";
import {
  SESSION_COOKIE_NAMES, sessionCookieNameFor, sessionTokenFromHeader,
} from "@/lib/auth/cookie-name";

// Имя session-cookie нужно в трёх местах: выдача сессии, middleware и
// realtime-процесс, который живёт вне Next и getEnv() позвать не может.
// Раньше оно было продублировано во всех трёх — тесты держат общий модуль,
// чтобы копии не завелись снова.

describe("имя session-cookie", () => {
  it("по https берёт префикс __Secure-", () => {
    expect(sessionCookieNameFor("https://inrenta.ru"))
      .toBe("__Secure-authjs.session-token");
  });

  it("по http остаётся голым — в деве префикса нет", () => {
    expect(sessionCookieNameFor("http://localhost:3000"))
      .toBe("authjs.session-token");
  });

  it("оба имени перечислены для тех, кто проверяет присутствие", () => {
    expect([...SESSION_COOKIE_NAMES]).toEqual([
      "authjs.session-token",
      "__Secure-authjs.session-token",
    ]);
  });

  it("список имён и вычисленное имя не расходятся", () => {
    for (const url of ["https://inrenta.ru", "http://localhost:3000"]) {
      expect(SESSION_COOKIE_NAMES).toContain(sessionCookieNameFor(url));
    }
  });
});

describe("токен из заголовка Cookie", () => {
  const dev = "http://localhost:3000";
  const prod = "https://inrenta.ru";

  it("достаёт токен по точному имени", () => {
    expect(sessionTokenFromHeader("a=1; authjs.session-token=good", dev)).toBe("good");
    expect(sessionTokenFromHeader("__Secure-authjs.session-token=good", prod)).toBe("good");
  });

  // Наивные split(";") + startsWith принимают это за нашу cookie. Ради этого
  // случая разбор и взят из пакета, а не написан руками.
  it("похожее имя за наше не принимает", () => {
    expect(sessionTokenFromHeader("xauthjs.session-token=evil", dev)).toBeNull();
    expect(sessionTokenFromHeader("authjs.session-token-x=evil", dev)).toBeNull();
  });

  it("не путает dev-имя с prod-именем", () => {
    expect(sessionTokenFromHeader("authjs.session-token=good", prod)).toBeNull();
    expect(sessionTokenFromHeader("__Secure-authjs.session-token=good", dev)).toBeNull();
  });

  it("пустой и отсутствующий заголовок дают null", () => {
    expect(sessionTokenFromHeader(undefined, dev)).toBeNull();
    expect(sessionTokenFromHeader(null, dev)).toBeNull();
    expect(sessionTokenFromHeader("", dev)).toBeNull();
    expect(sessionTokenFromHeader("other=1", dev)).toBeNull();
  });
});

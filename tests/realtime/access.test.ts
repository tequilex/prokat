import { describe, it, expect } from "vitest";
import { isAllowedOrigin, sessionVerdict } from "@/lib/realtime/access";

// Единственная поверхность, отделяющая чужие события от своих. Живого Postgres
// тесты не требуют, поэтому вердикт вынесен в чистую функцию над уже
// прочитанной строкой — иначе он остался бы непокрытым вовсе.

const now = new Date("2026-09-01T12:00:00Z");
const future = new Date("2026-10-01T12:00:00Z");
const past = new Date("2026-08-01T12:00:00Z");

describe("вердикт по строке сессии", () => {
  it("живая сессия пропускается", () => {
    expect(sessionVerdict({ userId: "u1", expires: future, bannedAt: null }, now))
      .toEqual({ ok: true, userId: "u1" });
  });

  it("строки нет — отказ", () => {
    expect(sessionVerdict(null, now)).toEqual({ ok: false, reason: "no_session" });
  });

  // Проверки срока не было в первой редакции плана: cookie живёт 30 дней, и без
  // неё протухшая сессия держала бы сокет.
  it("истёкшая сессия — отказ", () => {
    expect(sessionVerdict({ userId: "u1", expires: past, bannedAt: null }, now))
      .toEqual({ ok: false, reason: "expired" });
  });

  it("граница строгая: ровно now уже не годится", () => {
    expect(sessionVerdict({ userId: "u1", expires: now, bannedAt: null }, now))
      .toEqual({ ok: false, reason: "expired" });
  });

  // adminBanUser ставит бан, но сессии не удаляет — забаненный держит живую
  // cookie, и без этой проверки продолжал бы получать события.
  it("забаненный — отказ, даже с живой сессией", () => {
    expect(sessionVerdict({ userId: "u1", expires: future, bannedAt: past }, now))
      .toEqual({ ok: false, reason: "banned" });
  });
});

describe("allow-list Origin", () => {
  const allowed = ["https://inrenta.ru", "http://192.168.1.10:3000"];

  it("свой origin пропускается", () => {
    expect(isAllowedOrigin("https://inrenta.ru", allowed)).toBe(true);
    expect(isAllowedOrigin("http://192.168.1.10:3000", allowed)).toBe(true);
  });

  it("чужой отвергается", () => {
    expect(isAllowedOrigin("https://evil.ru", allowed)).toBe(false);
  });

  // WebSocket не подчиняется CORS, а non-browser клиенты Origin не шлют вовсе.
  // Типичная реализация `origin && !allowed.has(origin)` пропустила бы их все.
  it("отсутствующий Origin отвергается", () => {
    expect(isAllowedOrigin(undefined, allowed)).toBe(false);
    expect(isAllowedOrigin(null, allowed)).toBe(false);
    expect(isAllowedOrigin("", allowed)).toBe(false);
  });

  it("совпадение точное: ни префикс, ни поддомен не считаются", () => {
    expect(isAllowedOrigin("https://inrenta.ru.evil.com", allowed)).toBe(false);
    expect(isAllowedOrigin("https://www.inrenta.ru", allowed)).toBe(false);
    expect(isAllowedOrigin("https://inrenta.ru/", allowed)).toBe(false);
  });
});

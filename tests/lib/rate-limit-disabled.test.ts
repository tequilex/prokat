import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Выключатель читается один раз при загрузке модуля — поэтому тест грузит его
// заново с подменённым окружением, а не дёргает уже импортированный.

describe("аварийное отключение лимитов", () => {
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => { delete process.env.RATE_LIMIT_DISABLED; vi.resetModules(); });

  it("без флага лимит работает", async () => {
    delete process.env.RATE_LIMIT_DISABLED;
    const { checkLimit } = await import("@/lib/rate-limit");
    // login: 10 попыток за 15 минут и БЕЗ паузы между ними — на бакете с
    // паузой (reset, booking) отлуп пришёл бы по ней, а не по счётчику, и тест
    // проверял бы не то.
    for (let i = 0; i < 10; i++) expect(checkLimit("subj", "login").ok).toBe(true);
    expect(checkLimit("subj", "login").ok).toBe(false);
  });

  it("с флагом пропускает всё", async () => {
    process.env.RATE_LIMIT_DISABLED = "1";
    const { checkLimit } = await import("@/lib/rate-limit");
    for (let i = 0; i < 50; i++) expect(checkLimit("subj", "login").ok).toBe(true);
  });

  it("любое другое значение флага лимиты не снимает", async () => {
    process.env.RATE_LIMIT_DISABLED = "true";
    const { checkLimit } = await import("@/lib/rate-limit");
    for (let i = 0; i < 10; i++) checkLimit("subj2", "login");
    expect(checkLimit("subj2", "login").ok).toBe(false);
  });
});

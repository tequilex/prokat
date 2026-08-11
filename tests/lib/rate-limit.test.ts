import { describe, it, expect, beforeEach } from "vitest";
import { checkLimit, _resetForTests } from "@/lib/rate-limit";

beforeEach(() => { _resetForTests(); });

describe("rate limit: login", () => {
  it("allows ten attempts and refuses the eleventh", () => {
    const key = "a@ya.ru|1.2.3.4";
    for (let i = 0; i < 10; i++) expect(checkLimit(key, "login")).toEqual({ ok: true });

    const res = checkLimit(key, "login");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe("window");
      expect(res.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("has no gap between attempts — the counter does the work", () => {
    expect(checkLimit("a@ya.ru|ip", "login")).toEqual({ ok: true });
    expect(checkLimit("a@ya.ru|ip", "login")).toEqual({ ok: true });
  });

  it("keys are independent", () => {
    for (let i = 0; i < 10; i++) checkLimit("a@ya.ru|ip", "login");
    expect(checkLimit("b@ya.ru|ip", "login")).toEqual({ ok: true });
  });
});

describe("rate limit: письма", () => {
  it("puts a pause between resend attempts", () => {
    expect(checkLimit("a@ya.ru", "resend")).toEqual({ ok: true });
    const second = checkLimit("a@ya.ru", "resend");
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("gap");
  });

  it("caps reset requests per email", () => {
    expect(checkLimit("a@ya.ru", "reset")).toEqual({ ok: true });
  });

  it("allows ten mail requests per ip", () => {
    for (let i = 0; i < 10; i++) expect(checkLimit("1.2.3.4", "mail_ip")).toEqual({ ok: true });
    expect(checkLimit("1.2.3.4", "mail_ip").ok).toBe(false);
  });
});

describe("rate limit: существующие виды", () => {
  it("still limits bookings after the key rename", () => {
    expect(checkLimit("user-1", "booking")).toEqual({ ok: true });
    const second = checkLimit("user-1", "booking");
    expect(second.ok).toBe(false);
  });
});

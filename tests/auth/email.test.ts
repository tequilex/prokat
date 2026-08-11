import { describe, it, expect } from "vitest";
import { normalizeEmail, emailDomain, isBlockedDomain } from "@/lib/auth/email";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  A@Ya.RU ")).toBe("a@ya.ru");
  });
});

describe("emailDomain", () => {
  it("returns the part after the last @", () => {
    expect(emailDomain("a@ya.ru")).toBe("ya.ru");
  });
  it("returns null for a malformed address", () => {
    expect(emailDomain("not-an-email")).toBeNull();
    expect(emailDomain("@ya.ru")).toBeNull();
    expect(emailDomain("a@")).toBeNull();
  });
});

describe("isBlockedDomain", () => {
  it("blocks the built-in list", () => {
    expect(isBlockedDomain("a@gmail.com", [])).toBe(true);
    expect(isBlockedDomain("a@OUTLOOK.com", [])).toBe(true);
  });
  it("allows russian providers", () => {
    expect(isBlockedDomain("a@yandex.ru", [])).toBe(false);
    expect(isBlockedDomain("a@mail.ru", [])).toBe(false);
  });
  it("does not block subdomains implicitly", () => {
    expect(isBlockedDomain("a@mail.gmail.com.ru", [])).toBe(false);
  });
  it("honours the extra list from env", () => {
    expect(isBlockedDomain("a@foo.com", ["foo.com"])).toBe(true);
  });
  it("treats a malformed address as not blocked (validation catches it earlier)", () => {
    expect(isBlockedDomain("garbage", [])).toBe(false);
  });
});

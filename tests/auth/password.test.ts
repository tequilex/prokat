import { describe, it, expect } from "vitest";
import {
  hashPassword, verifyPassword, fakeVerify, checkPasswordRules, devSeedPassword,
} from "@/lib/auth/password";

describe("password hashing", () => {
  it("round-trips", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash).not.toContain("correct horse");
    expect(await verifyPassword(hash, "correct horse battery")).toBe(true);
    expect(await verifyPassword(hash, "wrong")).toBe(false);
  });

  it("fakeVerify resolves without throwing", async () => {
    await expect(fakeVerify()).resolves.toBeUndefined();
  });

  it("verifyPassword returns false on a malformed hash instead of throwing", async () => {
    expect(await verifyPassword("not-a-hash", "x")).toBe(false);
  });
});

describe("checkPasswordRules", () => {
  it("rejects short passwords", () => {
    expect(checkPasswordRules("short", "a@ya.ru")).toBe("Пароль короче 8 символов");
  });
  it("rejects a password equal to the email", () => {
    expect(checkPasswordRules("a@ya.ru", "A@YA.RU")).toBeTruthy();
  });
  it("rejects absurdly long passwords", () => {
    expect(checkPasswordRules("x".repeat(201), "a@ya.ru")).toBeTruthy();
  });
  it("accepts a sane password", () => {
    expect(checkPasswordRules("normalnyi-parol", "a@ya.ru")).toBeNull();
  });
});

describe("devSeedPassword", () => {
  it("returns null in production", async () => {
    expect(await devSeedPassword("production")).toBeNull();
  });
  it("returns a hash outside production", async () => {
    expect(await devSeedPassword("development")).toMatch(/^\$argon2id\$/);
  });
});

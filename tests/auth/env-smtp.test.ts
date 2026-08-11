import { describe, it, expect } from "vitest";
import { parseEnv } from "@/lib/env";

const base = {
  NODE_ENV: "test",
  DATABASE_URL: "postgres://app:test@localhost:5432/app",
  NEXTAUTH_URL: "http://localhost:3000",
  NEXTAUTH_SECRET: "x".repeat(32),
};

const smtp = {
  SMTP_HOST: "smtp.yandex.ru",
  SMTP_PORT: "465",
  SMTP_USER: "noreply@example.ru",
  SMTP_PASSWORD: "secret",
  SMTP_FROM: "noreply@example.ru",
};

describe("env: SMTP", () => {
  it("accepts env without SMTP (console transport in dev)", () => {
    expect(parseEnv(base).SMTP_HOST).toBeUndefined();
  });

  it("parses a full SMTP set", () => {
    expect(parseEnv({ ...base, ...smtp }).SMTP_PORT).toBe(465);
  });

  it("rejects a partial SMTP set", () => {
    const { SMTP_FROM: _omit, ...partial } = smtp;
    expect(() => parseEnv({ ...base, ...partial })).toThrow(/SMTP_/);
  });

  it("splits BLOCKED_EMAIL_DOMAINS into a list", () => {
    const env = parseEnv({ ...base, BLOCKED_EMAIL_DOMAINS: "Foo.com, bar.com ," });
    expect(env.BLOCKED_EMAIL_DOMAINS).toEqual(["foo.com", "bar.com"]);
  });

  it("leaves BLOCKED_EMAIL_DOMAINS undefined when unset", () => {
    expect(parseEnv(base).BLOCKED_EMAIL_DOMAINS).toBeUndefined();
  });
});

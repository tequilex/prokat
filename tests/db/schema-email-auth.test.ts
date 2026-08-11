import { describe, it, expect } from "vitest";
import { users, emailTokens, emailTokenPurpose } from "@db/schema";

describe("schema: email auth", () => {
  it("users has nullable password_hash", () => {
    expect(users.passwordHash).toBeDefined();
    expect(users.passwordHash.notNull).toBe(false);
  });

  it("email_tokens has the columns the flows rely on", () => {
    for (const col of ["id", "userId", "purpose", "tokenHash", "expiresAt", "usedAt", "createdAt"]) {
      expect(emailTokens[col as keyof typeof emailTokens]).toBeDefined();
    }
    expect(emailTokens.tokenHash.isUnique).toBe(true);
  });

  it("purpose enum covers verify and reset only", () => {
    expect(emailTokenPurpose.enumValues).toEqual(["verify", "reset"]);
  });
});

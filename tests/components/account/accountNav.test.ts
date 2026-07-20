import { describe, it, expect } from "vitest";
import { buildAccountNav } from "@/components/account/accountNav";

describe("buildAccountNav", () => {
  it("shows only personal tabs when there is no provider", () => {
    const items = buildAccountNav({ hasProvider: false, newRequestsCount: 0 });
    expect(items.map((i) => i.href)).toEqual(["/requests", "/profile"]);
  });

  it("adds owner tabs (with a separator) when a provider exists", () => {
    const items = buildAccountNav({ hasProvider: true, newRequestsCount: 2 });
    expect(items.map((i) => i.href)).toEqual([
      "/requests", "/profile",
      "/cabinet/requests", "/cabinet/listings", "/cabinet/calendar", "/cabinet/settings",
    ]);
    const ownerReq = items.find((i) => i.href === "/cabinet/requests")!;
    expect(ownerReq.badge).toBe(2);
    expect(ownerReq.separatorBefore).toBe(true);
    expect(items.some((i) => i.href === "/cabinet/stats")).toBe(false);
  });
});

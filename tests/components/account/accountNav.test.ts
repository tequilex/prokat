import { describe, it, expect } from "vitest";
import { buildAccountNav } from "@/components/account/accountNav";

describe("buildAccountNav", () => {
  it("shows all tabs with an owner separator", () => {
    const items = buildAccountNav({ newRequestsCount: 2 });
    expect(items.map((i) => i.href)).toEqual([
      "/requests", "/profile",
      "/cabinet/requests", "/cabinet/listings", "/cabinet/calendar",
    ]);
    const ownerReq = items.find((i) => i.href === "/cabinet/requests")!;
    expect(ownerReq.badge).toBe(2);
    expect(ownerReq.separatorBefore).toBe(true);
  });

  it("drops provider settings and stats tabs", () => {
    const items = buildAccountNav({ newRequestsCount: 0 });
    expect(items.some((i) => i.href === "/cabinet/settings")).toBe(false);
    expect(items.some((i) => i.href === "/cabinet/stats")).toBe(false);
  });
});

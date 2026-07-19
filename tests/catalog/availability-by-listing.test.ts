import { describe, it, expect } from "vitest";
import { buildAvailabilityByListing } from "@/lib/catalog/availability";

describe("buildAvailabilityByListing", () => {
  it("groups rows by listing and date", () => {
    const map = buildAvailabilityByListing([
      { listingId: "a", date: "2026-07-20", bookedQty: 1, blockedQty: 0 },
      { listingId: "a", date: "2026-07-21", bookedQty: 0, blockedQty: 2 },
      { listingId: "b", date: "2026-07-20", bookedQty: 3, blockedQty: 0 },
    ]);
    expect(map.get("a")!.get("2026-07-21")).toEqual({ bookedQty: 0, blockedQty: 2 });
    expect(map.get("b")!.size).toBe(1);
  });

  it("returns an empty map for no rows", () => {
    expect(buildAvailabilityByListing([]).size).toBe(0);
  });
});

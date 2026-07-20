import { describe, it, expect } from "vitest";
import * as schema from "@db/schema";
import { users, listings, bookingRequests, listingStatus } from "@db/schema";

describe("C2C schema shape", () => {
  it("users has verification columns", () => {
    const cols = Object.keys(users);
    expect(cols).toEqual(expect.arrayContaining(["isVerified", "verifiedAt"]));
  });

  it("listings is owned by user and carries city/location", () => {
    const cols = Object.keys(listings);
    expect(cols).toEqual(expect.arrayContaining(["ownerUserId", "cityId", "location"]));
    expect(cols).not.toContain("providerId");
  });

  it("bookingRequests references owner user, not provider", () => {
    const cols = Object.keys(bookingRequests);
    expect(cols).toEqual(expect.arrayContaining(["ownerUserId", "ownerComment"]));
    expect(cols).not.toContain("providerId");
    expect(cols).not.toContain("providerComment");
  });

  it("listingStatus enum has no on_moderation", () => {
    expect(listingStatus.enumValues).toEqual(["active", "hidden", "archived"]);
  });

  it("dropped provider/monetization tables are gone", () => {
    expect(schema).not.toHaveProperty("providers");
    expect(schema).not.toHaveProperty("subscriptions");
    expect(schema).not.toHaveProperty("promotions");
    expect(schema).not.toHaveProperty("providerPlan");
  });
});

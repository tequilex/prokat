import { describe, it, expect } from "vitest";
import { extractListingId, listingPath } from "@/lib/catalog/listing-path";

describe("extractListingId", () => {
  it("splits slug and ULID tail", () => {
    expect(extractListingId("drel-bosch-01ARZ3NDEKTSV4RRFFQ69G5FAV"))
      .toEqual({ slug: "drel-bosch", id: "01ARZ3NDEKTSV4RRFFQ69G5FAV" });
  });
  it("returns null for a plain subcategory slug", () => {
    expect(extractListingId("dreli")).toBeNull();
  });
  it("returns null when tail is not a ULID", () => {
    expect(extractListingId("kovrik-2")).toBeNull();
  });
});

describe("listingPath", () => {
  it("builds the canonical path", () => {
    expect(listingPath("kazan", "dreli", "drel-bosch", "01ARZ3NDEKTSV4RRFFQ69G5FAV"))
      .toBe("/kazan/dreli/drel-bosch-01ARZ3NDEKTSV4RRFFQ69G5FAV");
  });
});

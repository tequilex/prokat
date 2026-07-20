import { describe, it, expect } from "vitest";
import { listingFormSchema } from "@/lib/owner/validation";

const base = {
  title: "Дрель Bosch",
  categoryId: "c1",
  cityId: "city1",
  depositType: "none" as const,
  quantity: 1,
  priceDay: 500,
};

describe("listingFormSchema", () => {
  it("requires cityId", () => {
    const r = listingFormSchema.safeParse({ ...base, cityId: "" });
    expect(r.success).toBe(false);
  });

  it("accepts valid listing with city and optional location", () => {
    const r = listingFormSchema.safeParse({ ...base, location: "ул. Баумана" });
    expect(r.success).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { isPubliclyVisible, type ListingVisibility } from "@/lib/catalog/visibility";

const BAN = new Date("2026-01-01");

const listing = (over: Partial<ListingVisibility> = {}): ListingVisibility => ({
  status: "active",
  ownerBannedAt: null,
  ...over,
});

describe("isPubliclyVisible()", () => {
  it("показывает активное объявление живого владельца", () => {
    expect(isPubliclyVisible(listing())).toBe(true);
  });

  it.each(["hidden", "archived"] as const)("прячет %s объявление", (status) => {
    expect(isPubliclyVisible(listing({ status }))).toBe(false);
  });

  // Главное правило задачи: бан владельца убирает вещь с витрины, даже если
  // строка объявления осталась active. Статус гасится при бане, но на него одного
  // полагаться нельзя — админ может поднять объявление вручную.
  it("прячет активное объявление забаненного владельца", () => {
    expect(isPubliclyVisible(listing({ ownerBannedAt: BAN }))).toBe(false);
  });

  it("прячет скрытое объявление забаненного владельца", () => {
    expect(isPubliclyVisible(listing({ status: "hidden", ownerBannedAt: BAN }))).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { Wrench, Package } from "lucide-react";
import { verticalIcon } from "@/components/home/categoryIcon";

describe("verticalIcon", () => {
  it("maps a known vertical to its icon", () => {
    expect(verticalIcon("tools")).toBe(Wrench);
  });
  it("falls back to Package for unknown verticals", () => {
    expect(verticalIcon("something-new")).toBe(Package);
  });
});

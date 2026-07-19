import { describe, it, expect } from "vitest";
import { parseQuery } from "@/lib/catalog/filters";

describe("parseQuery", () => {
  it("trims the query", () => {
    expect(parseQuery({ q: "  дрель  " })).toBe("дрель");
  });
  it("returns empty string when absent or blank", () => {
    expect(parseQuery({})).toBe("");
    expect(parseQuery({ q: "   " })).toBe("");
  });
});

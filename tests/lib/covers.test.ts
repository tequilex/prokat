import { describe, it, expect } from "vitest";
import {
  COVER_PRESETS, DEFAULT_COVER, isCoverPreset, isOwnCoverUrl, resolveCoverUrl,
} from "@/lib/covers";

describe("covers", () => {
  it("keeps every preset under /covers/ so the whitelist predicate holds", () => {
    for (const p of COVER_PRESETS) {
      expect(p.url.startsWith("/covers/")).toBe(true);
      expect(isCoverPreset(p.url)).toBe(true);
    }
    expect(isCoverPreset("https://images.example.ru/mine.webp")).toBe(false);
  });

  it("resolves NULL to the default preset", () => {
    expect(resolveCoverUrl(null)).toBe(DEFAULT_COVER.url);
  });

  it("swaps an orphaned preset path for the default instead of a broken image", () => {
    // Так уже было: пресет убрали из списка, а в БД остался его адрес.
    expect(resolveCoverUrl("/covers/clothes.svg")).toBe(DEFAULT_COVER.url);
    expect(resolveCoverUrl(COVER_PRESETS[1]!.url)).toBe(COVER_PRESETS[1]!.url);
  });

  it("keeps own uploads untouched and tells them apart from presets", () => {
    const own = "https://images.example.ru/mine.webp";
    expect(resolveCoverUrl(own)).toBe(own);
    expect(isOwnCoverUrl(own)).toBe(true);
    expect(isOwnCoverUrl(DEFAULT_COVER.url)).toBe(false);
    expect(isOwnCoverUrl("/covers/clothes.svg")).toBe(false);
    expect(isOwnCoverUrl(null)).toBe(false);
  });
});

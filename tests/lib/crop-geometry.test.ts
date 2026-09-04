import { describe, it, expect } from "vitest";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  baseScale,
  clampOffset,
  clampZoom,
  cropRect,
  maxOffset,
  type CropView,
} from "@/lib/images/crop-geometry";

// Ландшафтный исходник во вьюпорте 300: по высоте впритык, по ширине запас.
const landscape: CropView = {
  imageWidth: 1600,
  imageHeight: 900,
  viewport: 300,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
};

describe("clampZoom", () => {
  it("keeps zoom inside the allowed range", () => {
    expect(clampZoom(0.2)).toBe(MIN_ZOOM);
    expect(clampZoom(99)).toBe(MAX_ZOOM);
    expect(clampZoom(2.5)).toBe(2.5);
  });

  it("falls back to the minimum on garbage instead of poisoning the math", () => {
    expect(clampZoom(Number.NaN)).toBe(MIN_ZOOM);
  });
});

describe("baseScale", () => {
  it("covers the viewport by the shorter side", () => {
    expect(baseScale(1600, 900, 300)).toBeCloseTo(300 / 900);
    expect(baseScale(900, 1600, 300)).toBeCloseTo(300 / 900);
  });

  it("does not divide by zero on a degenerate image", () => {
    expect(baseScale(0, 0, 300)).toBe(1);
  });
});

describe("clampOffset", () => {
  it("pins the tight axis to zero and leaves room on the other", () => {
    const max = maxOffset(landscape);
    // Высота вписана впритык — вертикально двигать нечего.
    expect(max.y).toBe(0);
    // Ширина: 1600 * (300/900) = 533.33, запас в обе стороны — половина разницы.
    expect(max.x).toBeCloseTo((1600 * (300 / 900) - 300) / 2);
  });

  it("never lets the image leave a gap at the edge", () => {
    const pulled = clampOffset({ ...landscape, offsetX: 9999, offsetY: 9999 });
    expect(pulled.x).toBeCloseTo(maxOffset(landscape).x);
    expect(pulled.y).toBe(0);

    const pushed = clampOffset({ ...landscape, offsetX: -9999, offsetY: -9999 });
    expect(pushed.x).toBeCloseTo(-maxOffset(landscape).x);
    // toBeCloseTo, а не toBe: прижатая ось даёт -0, и toBe отличил бы его от 0.
    expect(pushed.y).toBeCloseTo(0);
  });

  it("gives more room as zoom grows", () => {
    const near = maxOffset({ ...landscape, zoom: 1 });
    const far = maxOffset({ ...landscape, zoom: 3 });
    expect(far.x).toBeGreaterThan(near.x);
    expect(far.y).toBeGreaterThan(0);
  });
});

describe("cropRect", () => {
  it("takes a centred square of the shorter side at zoom 1", () => {
    const rect = cropRect(landscape);
    expect(rect.size).toBeCloseTo(900);
    expect(rect.sx).toBeCloseTo((1600 - 900) / 2);
    expect(rect.sy).toBeCloseTo(0);
  });

  it("halves the square at double zoom", () => {
    expect(cropRect({ ...landscape, zoom: 2 }).size).toBeCloseTo(450);
  });

  it("moves the window opposite to the drag", () => {
    // Картинку тянут вправо — в кадр уезжает её левая часть.
    const dragged = cropRect({ ...landscape, offsetX: 50 });
    expect(dragged.sx).toBeLessThan(cropRect(landscape).sx);
  });

  it("stays inside the source even when asked to run off the edge", () => {
    const rect = cropRect({ ...landscape, offsetX: -9999, offsetY: -9999 });
    expect(rect.sx).toBeGreaterThanOrEqual(0);
    expect(rect.sy).toBeGreaterThanOrEqual(0);
    expect(rect.sx + rect.size).toBeLessThanOrEqual(landscape.imageWidth + 1e-9);
    expect(rect.sy + rect.size).toBeLessThanOrEqual(landscape.imageHeight + 1e-9);
  });

  it("works the same way on a portrait source", () => {
    const rect = cropRect({ ...landscape, imageWidth: 900, imageHeight: 1600 });
    expect(rect.size).toBeCloseTo(900);
    expect(rect.sx).toBeCloseTo(0);
    expect(rect.sy).toBeCloseTo((1600 - 900) / 2);
  });
});

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Gallery } from "@/components/catalog/Gallery";

const photos = [
  { url: "/demo/1.webp", width: 800, height: 600 },
  { url: "/demo/2.webp", width: 800, height: 600 },
];

describe("Gallery", () => {
  it("swaps the main image when a thumbnail is clicked", () => {
    render(<Gallery photos={photos} title="Дрель" />);
    expect(screen.getByAltText("Дрель — фото 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Фото 2" }));
    expect(screen.getByAltText("Дрель — фото 2")).toBeInTheDocument();
  });

  it("opens a fullscreen lightbox on main image click", () => {
    render(<Gallery photos={photos} title="Дрель" />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Открыть фото на весь экран" }));
    expect(screen.getByRole("dialog", { name: "Просмотр фото" })).toBeInTheDocument();
  });

  it("shows a placeholder and no lightbox when there are no photos", () => {
    render(<Gallery photos={[]} title="Дрель" />);
    expect(screen.getByText("Без фото")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

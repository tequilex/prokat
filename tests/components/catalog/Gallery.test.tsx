import { render, screen, fireEvent, within } from "@testing-library/react";
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

  it("closes the lightbox from the cross and from the backdrop", () => {
    render(<Gallery photos={photos} title="Дрель" />);
    const open = () => fireEvent.click(screen.getByRole("button", { name: "Открыть фото на весь экран" }));

    open();
    fireEvent.click(screen.getByRole("button", { name: "Закрыть" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    open();
    fireEvent.click(screen.getByRole("dialog", { name: "Просмотр фото" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the lightbox open while paging through photos", () => {
    render(<Gallery photos={photos} title="Дрель" />);
    fireEvent.click(screen.getByRole("button", { name: "Открыть фото на весь экран" }));
    fireEvent.click(screen.getByRole("button", { name: "Следующее фото" }));
    const dialog = screen.getByRole("dialog", { name: "Просмотр фото" });
    expect(within(dialog).getByAltText("Дрель — фото 2")).toBeInTheDocument();
  });

  it("shows a placeholder and no lightbox when there are no photos", () => {
    render(<Gallery photos={[]} title="Дрель" />);
    expect(screen.getByText("Без фото")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

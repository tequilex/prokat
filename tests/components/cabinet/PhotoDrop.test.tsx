import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PhotoDrop } from "@/components/cabinet/PhotoDrop";

const photo = (n: number) => ({ url: `https://cdn.test/${n}.webp`, width: 800, height: 600 });

const props = {
  max: 3,
  uploading: false,
  error: null,
  onFiles: vi.fn(),
  onRemove: vi.fn(),
};

describe("PhotoDrop", () => {
  it("marks only the first photo as the cover", () => {
    render(<PhotoDrop {...props} photos={[photo(1), photo(2)]} />);
    expect(screen.getAllByText("Обложка")).toHaveLength(1);
  });

  it("hides the drop zone once the limit is reached", () => {
    const { rerender } = render(<PhotoDrop {...props} photos={[photo(1)]} />);
    expect(screen.getByText(/Положите вещь в скобки/)).toBeInTheDocument();

    rerender(<PhotoDrop {...props} photos={[photo(1), photo(2), photo(3)]} />);
    expect(screen.queryByText(/Положите вещь в скобки/)).not.toBeInTheDocument();
  });

  it("shows progress in the drop zone instead of a spinner while uploading", () => {
    render(<PhotoDrop {...props} photos={[]} uploading />);
    expect(screen.getByText("Загружаем фото…")).toBeInTheDocument();
  });

  it("reports which photo was removed", () => {
    const onRemove = vi.fn();
    render(<PhotoDrop {...props} photos={[photo(1), photo(2)]} onRemove={onRemove} />);
    fireEvent.click(screen.getByRole("button", { name: "Удалить фото 2" }));
    expect(onRemove).toHaveBeenCalledWith("https://cdn.test/2.webp");
  });
});

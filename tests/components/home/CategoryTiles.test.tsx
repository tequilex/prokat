import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CategoryTiles } from "@/components/home/CategoryTiles";

describe("CategoryTiles", () => {
  const cats = [
    { slug: "instrument", name: "Инструмент", vertical: "tools", count: 3 },
    { slug: "sport", name: "Спорт", vertical: "sport" },
  ];

  it("links each tile into the city", () => {
    render(<CategoryTiles citySlug="kazan" categories={cats} />);
    expect(screen.getByRole("link", { name: /Инструмент/ })).toHaveAttribute(
      "href",
      "/kazan/instrument",
    );
    expect(screen.getByRole("link", { name: /Спорт/ })).toHaveAttribute("href", "/kazan/sport");
  });

  it("shows a count when provided", () => {
    render(<CategoryTiles citySlug="kazan" categories={cats} />);
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });
});

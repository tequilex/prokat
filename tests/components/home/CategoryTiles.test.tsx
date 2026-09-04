import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CategoryTiles } from "@/components/home/CategoryTiles";
import { content } from "@theme/content";

describe("CategoryTiles", () => {
  const cats = [
    { slug: "instrument", name: "Инструмент", vertical: "tools" },
    { slug: "sport", name: "Спорт", vertical: "sport" },
  ];

  it("links each chip into the city", () => {
    render(<CategoryTiles citySlug="kazan" categories={cats} />);
    expect(screen.getByRole("link", { name: /Инструмент/ })).toHaveAttribute(
      "href",
      "/kazan/instrument",
    );
    expect(screen.getByRole("link", { name: /Спорт/ })).toHaveAttribute("href", "/kazan/sport");
  });

  it("closes the row with a link to every category", () => {
    render(<CategoryTiles citySlug="kazan" categories={cats} />);
    expect(
      screen.getByRole("link", { name: content.home.categoriesAll }),
    ).toHaveAttribute("href", "/kazan");
  });

  it("renders nothing when the city has no non-empty categories", () => {
    const { container } = render(<CategoryTiles citySlug="kazan" categories={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

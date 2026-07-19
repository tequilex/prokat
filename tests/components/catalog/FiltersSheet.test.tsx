import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FiltersSheet } from "@/components/catalog/FiltersSheet";

describe("FiltersSheet", () => {
  it("shows a Фильтры trigger", () => {
    render(
      <FiltersSheet>
        <div>form</div>
      </FiltersSheet>,
    );
    expect(screen.getByRole("button", { name: /Фильтры/ })).toBeInTheDocument();
  });
});

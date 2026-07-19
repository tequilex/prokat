import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CitySelector } from "@/components/layout/CitySelector";

describe("CitySelector", () => {
  const cities = [
    { slug: "msk", name: "Москва" },
    { slug: "spb", name: "Санкт-Петербург" },
  ];

  it("shows the current city name on the trigger", () => {
    render(<CitySelector cities={cities} currentSlug="msk" />);
    expect(screen.getByRole("button", { name: /Москва/ })).toBeInTheDocument();
  });

  it("falls back to «Город» when no current city", () => {
    render(<CitySelector cities={cities} />);
    expect(screen.getByRole("button", { name: /Город/ })).toBeInTheDocument();
  });
});

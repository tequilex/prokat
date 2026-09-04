import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ListYourItemBand } from "@/components/home/ListYourItemBand";
import { content } from "@theme/content";

describe("ListYourItemBand", () => {
  it("renders the band title and a CTA link to the given href", () => {
    render(<ListYourItemBand href="/login" />);
    expect(screen.getByRole("heading", { name: content.home.bandTitle })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: content.home.bandCta })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("answers every question of the fact list", () => {
    render(<ListYourItemBand href="/login" />);
    for (const fact of content.home.bandFacts) {
      expect(screen.getByText(fact.q)).toBeInTheDocument();
      expect(screen.getByText(fact.a)).toBeInTheDocument();
    }
  });
});

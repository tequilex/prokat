import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { HowItWorks } from "@/components/home/HowItWorks";
import { content } from "@theme/content";

describe("HowItWorks", () => {
  it("renders the heading and every step title", () => {
    render(<HowItWorks />);
    expect(screen.getByText(content.home.howHeading)).toBeInTheDocument();
    for (const step of content.home.howSteps) {
      expect(screen.getByText(step.title)).toBeInTheDocument();
    }
  });
});

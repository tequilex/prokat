import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { HowItWorks } from "@/components/home/HowItWorks";
import { content } from "@theme/content";

describe("HowItWorks", () => {
  it("renders the heading and every step caption", () => {
    render(<HowItWorks />);
    expect(screen.getByRole("heading", { name: content.home.howHeading })).toBeInTheDocument();
    for (const step of content.home.howSteps) {
      expect(screen.getByText(step.step)).toBeInTheDocument();
      expect(screen.getByText(step.text)).toBeInTheDocument();
    }
  });

  it("draws the screens without real controls", () => {
    // Макеты — картинки интерфейса, а не рабочие экраны. Настоящее поле здесь
    // потребовало бы контракта ui/field.ts (см. tests/theme/fields.test.ts),
    // а настоящая кнопка обещала бы человеку действие, которого нет.
    render(<HowItWorks />);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

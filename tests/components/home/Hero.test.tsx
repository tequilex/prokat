import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Hero } from "@/components/home/Hero";
import { content } from "@theme/content";

describe("Hero", () => {
  it("keeps a still accessible name for the heading and links the catalog into the city", () => {
    render(<Hero citySlug="kazan" placeHref="/cabinet/listings/new" />);

    // Слово в скобках меняется каждые пару секунд и скринридеру не отдаётся:
    // доступное имя заголовка обязано быть неподвижным.
    expect(
      screen.getByRole("heading", {
        name: `${content.home.heroLead} ${content.home.heroTitleTail}`,
      }),
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: content.home.heroCatalog })).toHaveAttribute(
      "href",
      "/kazan",
    );
    expect(screen.getByRole("link", { name: content.home.heroPlace })).toHaveAttribute(
      "href",
      "/cabinet/listings/new",
    );
  });

  it("sends the catalog button to search when there is no active city", () => {
    render(<Hero placeHref="/login" />);
    expect(screen.getByRole("link", { name: content.home.heroCatalog })).toHaveAttribute(
      "href",
      "/search",
    );
  });

  it("sends an anonymous visitor to the login route with the place page to return to", () => {
    // Ветка с LoginTrigger идёт через Radix Slot: тот прокидывает className
    // кнопки в чужой компонент, и молча потерять весь вид тут проще всего.
    render(
      <Hero
        citySlug="kazan"
        placeHref="/login"
        authProps={{ nextAuthProviders: [], vkEnabled: false, canRegisterByEmail: false }}
      />,
    );
    const place = screen.getByRole("link", { name: content.home.heroPlace });
    expect(place).toHaveAttribute("href", "/login?from=%2Fcabinet%2Flistings%2Fnew");
    expect(place).toHaveClass("bg-transparent");
  });

  it("shows every info tile", () => {
    render(<Hero citySlug="kazan" placeHref="/login" />);
    for (const fact of content.home.heroFacts) {
      expect(screen.getByText(fact.title)).toBeInTheDocument();
    }
  });
});

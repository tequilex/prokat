import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useSelectedLayoutSegment: () => "01B",
}));

const { ThreadList } = await import("@/components/chat/ThreadList");
const { content } = await import("@theme/content");

type Item = Parameters<typeof ThreadList>[0]["threads"][number];

const thread = (over: Partial<Item>): Item => ({
  id: "01A",
  listingId: "01L",
  listingTitle: "Дрель Bosch",
  listingSlug: "drel-bosch",
  listingImage: null,
  counterpartId: "01U",
  counterpartName: "Иван",
  counterpartImage: null,
  lastMessageAt: new Date("2026-08-31T10:00:00"),
  preview: "свободна на выходных",
  lastMessageMine: false,
  iAmOwner: false,
  lastMessageReadByCounterpart: false,
  unread: 0,
  ...over,
});

const threads: Item[] = [
  thread({}),
  thread({ id: "01B", counterpartName: "Мария", listingTitle: "Палатка", preview: "заберу завтра", unread: 3 }),
  thread({ id: "01C", counterpartName: "Пётр", listingTitle: "Мангал", preview: "спасибо", iAmOwner: true }),
];

describe("ThreadList", () => {
  it("показывает все переписки", () => {
    render(<ThreadList threads={threads} />);
    expect(screen.getByText("Иван")).toBeInTheDocument();
    expect(screen.getByText("Мария")).toBeInTheDocument();
    expect(screen.getByText("Пётр")).toBeInTheDocument();
  });

  it("подсвечивает открытую переписку", () => {
    render(<ThreadList threads={threads} />);
    const links = screen.getAllByRole("link");
    const current = links.filter((l) => l.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute("href", "/chat/01B");
  });

  it("ищет по имени, вещи и превью", () => {
    render(<ThreadList threads={threads} />);
    const search = screen.getByLabelText(content.chat.searchPlaceholder);

    fireEvent.change(search, { target: { value: "мангал" } });
    expect(screen.getByText("Пётр")).toBeInTheDocument();
    expect(screen.queryByText("Иван")).toBeNull();

    fireEvent.change(search, { target: { value: "" } });
    fireEvent.change(search, { target: { value: "завтра" } });
    expect(screen.getByText("Мария")).toBeInTheDocument();
    expect(screen.queryByText("Пётр")).toBeNull();
  });

  it("сообщает, когда ничего не нашлось", () => {
    render(<ThreadList threads={threads} />);
    fireEvent.change(screen.getByLabelText(content.chat.searchPlaceholder), { target: { value: "вертолёт" } });
    const empty = screen.getByRole("status");
    expect(empty).toHaveTextContent(content.chat.nothingFound);
  });

  it("фильтрует непрочитанные и считает треды, а не сообщения", () => {
    render(<ThreadList threads={threads} />);
    // Непрочитанный тред один, сообщений в нём три — в чипе должна быть единица.
    const chip = screen.getByRole("button", { name: `${content.chat.filterUnread} · 1` });
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Мария")).toBeInTheDocument();
    expect(screen.queryByText("Иван")).toBeNull();
  });

  it("фильтрует свои вещи", () => {
    render(<ThreadList threads={threads} />);
    fireEvent.click(screen.getByRole("button", { name: content.chat.filterMine }));
    expect(screen.getByText("Пётр")).toBeInTheDocument();
    expect(screen.queryByText("Мария")).toBeNull();
  });

  it("без непрочитанных счётчик в чипе не рисуется", () => {
    render(<ThreadList threads={[thread({})]} />);
    expect(screen.getByRole("button", { name: content.chat.filterUnread })).toBeInTheDocument();
  });

  // Статус только иконкой недоступен скринридеру.
  it("подписывает статус своего сообщения словом", () => {
    render(<ThreadList threads={[thread({ lastMessageMine: true, lastMessageReadByCounterpart: true })]} />);
    expect(screen.getByText(content.chat.read)).toBeInTheDocument();
  });

  it("непрочитанное своё помечает как доставленное", () => {
    render(<ThreadList threads={[thread({ lastMessageMine: true })]} />);
    expect(screen.getByText(content.chat.delivered)).toBeInTheDocument();
  });
});

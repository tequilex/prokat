import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const back = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back, push }),
}));

const { ThreadBackButton } = await import("@/components/chat/ThreadBackButton");
const { content } = await import("@theme/content");

function withHistoryLength(length: number) {
  Object.defineProperty(window.history, "length", { value: length, configurable: true });
}

beforeEach(() => {
  back.mockClear();
  push.mockClear();
});

describe("ThreadBackButton", () => {
  // Ссылка на /chat кладёт в историю новую запись, и «назад» у заголовка
  // раздела возвращает со списка обратно в переписку — человек ходит по кругу.
  // Поэтому только history.back().
  it("уходит назад по истории, а не переходит на список", () => {
    withHistoryLength(3);
    render(<ThreadBackButton />);
    fireEvent.click(screen.getByRole("button", { name: content.chat.back }));
    expect(back).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
  });

  // Переписку могли открыть по прямой ссылке или после редиректа с карточки:
  // возвращаться некуда, и без запасного пути кнопка не делала бы ничего.
  it("без истории ведёт на список", () => {
    withHistoryLength(1);
    render(<ThreadBackButton />);
    fireEvent.click(screen.getByRole("button", { name: content.chat.back }));
    expect(push).toHaveBeenCalledWith("/chat");
    expect(back).not.toHaveBeenCalled();
  });
});

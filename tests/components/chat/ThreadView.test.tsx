import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
  useSelectedLayoutSegment: () => null,
}));

vi.mock("@/server/actions/chat", () => ({
  markThreadRead: vi.fn(async () => ({ ok: true, data: undefined })),
  fetchOlderMessages: vi.fn(),
  postMessage: vi.fn(),
  startThread: vi.fn(),
}));

const { ThreadView } = await import("@/components/chat/ThreadView");
const { ChatPanes } = await import("@/components/chat/ChatPanes");
const { content } = await import("@theme/content");

const message = (id: string, sender: string, body: string) => ({
  id, senderUserId: sender, body, createdAt: new Date("2026-08-31T10:00:00Z"),
});

const base = {
  mode: { kind: "thread", threadId: "01T" } as const,
  viewerId: "01ME",
  initialMessages: [message("01A", "01THEM", "здравствуйте")],
  initialHasMore: false,
};

describe("ThreadView", () => {
  it("даёт написать, когда переписка открыта", () => {
    render(<ThreadView {...base} />);
    expect(screen.getByLabelText("Текст сообщения")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Отправить" })).toBeInTheDocument();
  });

  // Композер должен исчезать целиком, а не просто отклонять отправку: правило
  // «читать можно всегда, писать — нет» обязано быть видно на экране.
  it("прячет композер и объясняет причину, когда писать нельзя", () => {
    render(<ThreadView {...base} blockedReason="Объявление снято с публикации." />);
    expect(screen.queryByLabelText("Текст сообщения")).toBeNull();
    expect(screen.queryByRole("button", { name: "Отправить" })).toBeNull();
    expect(screen.getByText("Объявление снято с публикации.")).toBeInTheDocument();
  });

  it("показывает историю и не теряет её при блокировке", () => {
    render(<ThreadView {...base} blockedReason="Аккаунт собеседника заблокирован." />);
    expect(screen.getByText("здравствуйте")).toBeInTheDocument();
  });

  it("без ранней истории кнопки подгрузки нет", () => {
    render(<ThreadView {...base} />);
    expect(screen.queryByRole("button", { name: /более ранние/ })).toBeNull();
  });

  it("с ранней историей кнопка подгрузки есть", () => {
    render(<ThreadView {...base} initialHasMore />);
    expect(screen.getByRole("button", { name: /более ранние/ })).toBeInTheDocument();
  });

  // initialMessages только засевают состояние. Значит при переходе между
  // переписками компонент обязан монтироваться заново — иначе в новой
  // переписке останется лента предыдущей. За это отвечает key={threadId}
  // на странице треда; здесь фиксируем сам факт, что состояние не следует
  // за пропами.
  it("не подхватывает новые initialMessages без пересоздания", () => {
    const { rerender } = render(<ThreadView {...base} />);
    rerender(
      <ThreadView
        {...base}
        mode={{ kind: "thread", threadId: "01OTHER" }}
        initialMessages={[message("01B", "01THEM", "другая переписка")]}
      />,
    );
    expect(screen.queryByText("другая переписка")).toBeNull();
    expect(screen.getByText("здравствуйте")).toBeInTheDocument();
  });
});

// Индикатор сделан заранее под задачу о вебсокетах и до неё всегда выключен.
// Тест держит проп живым: без него компонент к тому моменту разойдётся с
// реальностью, и tsc этого не поймает.
describe("ThreadView: заготовка под реальное время", () => {
  it("по умолчанию «печатает…» не показывает", () => {
    render(<ThreadView {...base} counterpartName="Иван" />);
    expect(screen.queryByText(/печатает/)).toBeNull();
  });

  it("с typing показывает индикатор и называет собеседника", () => {
    render(<ThreadView {...base} typing counterpartName="Иван" />);
    expect(screen.getByText(`Иван ${content.chat.typing}`)).toBeInTheDocument();
  });
});

describe("ThreadView: быстрые ответы", () => {
  // Очередь за мной — последним писал собеседник.
  it("предлагаются, когда последним писал собеседник", () => {
    render(<ThreadView {...base} />);
    expect(screen.getByRole("button", { name: content.chat.quickReplies[0] })).toBeInTheDocument();
  });

  it("не предлагаются, когда последним писал я", () => {
    render(
      <ThreadView {...base} initialMessages={[message("01A", "01ME", "моё последнее")]} />,
    );
    expect(screen.queryByRole("button", { name: content.chat.quickReplies[0] })).toBeNull();
  });

  // Отправка в один тап необратима и тратит лимит — чип только подставляет.
  it("подставляют текст в черновик, а не отправляют", () => {
    render(<ThreadView {...base} />);
    fireEvent.click(screen.getByRole("button", { name: content.chat.quickReplies[0] }));
    expect(screen.getByLabelText(content.chat.composerLabel))
      .toHaveValue(content.chat.quickReplies[0]);
  });

  it("после подстановки исчезают, чтобы не затереть набранное", () => {
    render(<ThreadView {...base} />);
    fireEvent.click(screen.getByRole("button", { name: content.chat.quickReplies[0] }));
    expect(screen.queryByRole("button", { name: content.chat.quickReplies[1] })).toBeNull();
  });
});

describe("ChatPanes", () => {
  // Без переписок список колонкой не занимает места — иначе на десктопе выходят
  // две заглушки рядом, обе про одно и то же.
  it("без переписок не рисует колонку списка", () => {
    render(
      <ChatPanes list={<nav aria-label="Переписки" />} hasThreads={false}>
        <p>заглушка</p>
      </ChatPanes>,
    );
    expect(screen.queryByLabelText("Переписки")).toBeNull();
    expect(screen.getByText("заглушка")).toBeInTheDocument();
  });

  it("с переписками показывает обе колонки", () => {
    render(
      <ChatPanes list={<nav aria-label="Переписки" />} hasThreads>
        <p>заглушка</p>
      </ChatPanes>,
    );
    expect(screen.getByLabelText("Переписки")).toBeInTheDocument();
    expect(screen.getByText("заглушка")).toBeInTheDocument();
  });
});

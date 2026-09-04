import { StrictMode } from "react";
import { render, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/chat",
}));

const toastFn = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast: toastFn }));

// Повторяет контракт сервера: содержимое всплывашки возвращается ТОЛЬКО когда
// передано событие. На вызов «просто дай счётчики» (подключение, resync,
// возврат видимости) тоста нет — иначе он всплывал бы на каждом из них.
const fetchUpdate = vi.hoisted(() => vi.fn(async (event?: unknown) => ({
  ok: true as const,
  data: {
    counters: { messages: 1, incoming: 0, mine: 0 },
    toast: event ? { title: "Аня", text: "Привет", href: "/chat/t1" } : null,
  },
})));
vi.mock("@/server/actions/realtime", () => ({ fetchRealtimeUpdate: fetchUpdate }));

// Свой WebSocket: настоящего в jsdom нет, а нам нужно видеть, сколько
// экземпляров живо и кому уходят кадры.
class FakeSocket {
  static instances: FakeSocket[] = [];
  static OPEN = 1;
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: ((e: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(public url: string) {
    FakeSocket.instances.push(this);
  }

  open() { this.readyState = 1; this.onopen?.(); }
  deliver(frame: unknown) { this.onmessage?.({ data: JSON.stringify(frame) }); }
  // onclose ОТЛОЖЕН, как у настоящего WebSocket: close() возвращается сразу, а
  // событие приходит следующим тиком. Ровно в этом зазоре и жил баг — уборка
  // эффекта успевала завершиться, StrictMode монтировал новый сокет, и только
  // потом приходил onclose старого. Синхронный фейк такого не воспроизводит и
  // проходил даже на сломанном коде.
  close(code = 1000) {
    if (this.closed) return;
    this.closed = true;
    this.readyState = 3;
    setTimeout(() => this.onclose?.({ code }), 0);
  }

  static get live() { return FakeSocket.instances.filter((s) => !s.closed); }
}

vi.stubGlobal("WebSocket", FakeSocket);

const { RealtimeProvider } = await import("@/components/realtime/RealtimeProvider");
const { useRealtime } = await import("@/components/realtime/context");

beforeEach(() => {
  FakeSocket.instances = [];
  toastFn.mockClear();
  fetchUpdate.mockClear();
});

describe("RealtimeProvider", () => {
  // StrictMode в деве монтирует эффект дважды. Уборка первого прогона закрывает
  // сокет, но его onclose приходит ПОЗЖЕ — и если он обнулит ссылку уже на
  // новый сокет и запланирует переподключение, во вкладке останется два живых
  // соединения. Наружу это выглядело как две одинаковые всплывашки на одно
  // сообщение — так баг и нашёлся.
  it("под StrictMode оставляет ровно одно живое соединение", async () => {
    render(
      <StrictMode>
        <RealtimeProvider enabled>x</RealtimeProvider>
      </StrictMode>,
    );
    await waitFor(() => expect(FakeSocket.instances.length).toBeGreaterThan(0));
    expect(FakeSocket.live).toHaveLength(1);

    // Ждать обязательно: воскрешение происходит не сразу, а через backoff
    // (база 1000 мс с джиттером). Проверка сразу после монтирования проходит
    // даже на сломанном коде — это и делало первую версию теста бесполезной.
    const seen = FakeSocket.instances.length;
    await act(async () => { await new Promise((r) => setTimeout(r, 2000)); });
    expect(FakeSocket.live, "закрытый сокет не должен переподключаться").toHaveLength(1);
    expect(FakeSocket.instances.length, "лишних соединений не заводится").toBe(seen);
  }, 10_000);

  it("одно сообщение даёт одну всплывашку", async () => {
    render(
      <StrictMode>
        <RealtimeProvider enabled>x</RealtimeProvider>
      </StrictMode>,
    );
    await waitFor(() => expect(FakeSocket.live).toHaveLength(1));

    const socket = FakeSocket.live[0];
    await act(async () => {
      socket.open();
      socket.deliver({ type: "message", threadId: "t1", messageId: "m1", counters: true });
    });

    // Один кадр — один поход к серверу за содержимым и один тост. Мёртвые
    // сокеты кадров не получают: у них другой обработчик уже не «действующий».
    await waitFor(() => expect(toastFn).toHaveBeenCalledTimes(1));
    expect(toastFn.mock.calls[0][0]).toBe("Аня");
  });

  // Терминальный код означает, что переподключаться бессмысленно: сессии нет,
  // бан или чужой Origin. Без этого вкладка с мёртвой cookie долбилась бы в
  // сервер вечно и выедала лимитер.
  it.each([4001, 4002, 4003] as const)(
    "после терминального отказа %i не переподключается",
    async (code) => {
      render(<RealtimeProvider enabled>x</RealtimeProvider>);
      await waitFor(() => expect(FakeSocket.live).toHaveLength(1));

      const before = FakeSocket.instances.length;
      await act(async () => { FakeSocket.live[0].close(code); });
      await new Promise((r) => setTimeout(r, 50));

      expect(FakeSocket.instances.length).toBe(before);
    },
  );

  it("без сессии соединение не открывается вовсе", async () => {
    render(<RealtimeProvider enabled={false}>x</RealtimeProvider>);
    await new Promise((r) => setTimeout(r, 20));
    expect(FakeSocket.instances).toHaveLength(0);
  });

  // Статус для анонима должен быть idle, а не offline: на offline висит плашка
  // «связи нет», и она вылезала на публичных страницах у незалогиненных.
  it("аноним получает idle, а не offline", async () => {
    let seen = "";
    function Probe() {
      seen = useRealtime((s) => s.status);
      return null;
    }
    render(
      <RealtimeProvider enabled={false}>
        <Probe />
      </RealtimeProvider>,
    );
    await waitFor(() => expect(seen).toBe("idle"));
  });

  // Оба кода терминальны, но человеку это разные вещи, и isTerminalClose их не
  // различает. Коды заданы числами нарочно: это проводной контракт с процессом
  // realtime, и тест обязан упасть, если константа уедет.
  it.each([
    [4002, "banned"],
    [4001, "unauthorized"],
  ] as const)("код закрытия %i даёт статус %s", async (code, expected) => {
    let seen = "";
    function Probe() {
      seen = useRealtime((s) => s.status);
      return null;
    }
    render(<RealtimeProvider enabled><Probe /></RealtimeProvider>);
    await waitFor(() => expect(FakeSocket.live).toHaveLength(1));

    await act(async () => { FakeSocket.live[0].close(code); });
    await waitFor(() => expect(seen).toBe(expected));
  });
});

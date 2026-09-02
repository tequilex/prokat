import { describe, it, expect } from "vitest";
import { createRealtimeStore } from "@/components/realtime/store";

// Стор экземплярный, а не модульный. Причина не в стиле: модульный синглтон в
// Node-процессе общий для всех параллельных SSR-запросов, а счётчики
// персональные — засеяли синглтон при рендере, показали число одного человека
// другому. Этот тест и держит инвариант.

describe("стор реального времени", () => {
  it("два экземпляра не делят состояние", () => {
    const a = createRealtimeStore();
    const b = createRealtimeStore();

    a.getState().setCounters({ messages: 7, incoming: 2, mine: 1 });

    expect(a.getState().counters?.messages).toBe(7);
    expect(b.getState().counters).toBeNull();
  });

  it("на старте счётчики неизвестны, а не нулевые", () => {
    // null и нули — разные вещи: при null бейдж берёт серверный проп, при нулях
    // он показал бы «ничего нового», ничего на самом деле не зная.
    expect(createRealtimeStore().getState().counters).toBeNull();
  });

  it("потеря соединения возвращает счётчики в «неизвестно»", () => {
    const store = createRealtimeStore();
    store.getState().setCounters({ messages: 3, incoming: 1, mine: 0 });
    store.getState().forgetCounters();
    // Без этого умерший realtime заморозил бы бейдж на последнем известном
    // числе, и починить его не смог бы ни refresh, ни перезагрузка.
    expect(store.getState().counters).toBeNull();
  });

  it("событие по переписке запоминается для догона", () => {
    const store = createRealtimeStore();
    store.getState().pushMessage("t1", "m1");
    expect(store.getState().lastMessage).toMatchObject({ threadId: "t1", messageId: "m1" });
  });

  it("resync отмечается временем, чтобы повторный не потерялся", () => {
    const store = createRealtimeStore();
    expect(store.getState().resyncAt).toBeNull();
    store.getState().markResync();
    expect(typeof store.getState().resyncAt).toBe("number");
  });
});

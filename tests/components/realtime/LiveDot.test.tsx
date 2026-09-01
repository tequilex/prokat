import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LiveDot, LiveCount } from "@/components/realtime/LiveDot";
import { RealtimeContext } from "@/components/realtime/context";
import { createRealtimeStore } from "@/components/realtime/store";

// Правило областей существует ради одного: не показывать один и тот же факт
// дважды. Кружок на чатах и кружок на кабинете обязаны считать разное, иначе
// они дублируют друг друга — так это и выглядело до разделения.

function withStore(
  counters: { messages: number; notifications: number; requests: number } | null,
  ui: React.ReactNode,
) {
  const store = createRealtimeStore();
  if (counters) store.getState().setCounters(counters);
  return render(
    <RealtimeContext.Provider value={store}>{ui}</RealtimeContext.Provider>,
  );
}

const only = (messages: number, notifications: number, requests: number) =>
  ({ messages, notifications, requests });

describe("области индикаторов", () => {
  it("кружок чатов зажигают только сообщения", () => {
    withStore(only(2, 0, 0), <LiveDot scope="messages" />);
    expect(screen.getByText("Есть новое")).toBeInTheDocument();
  });

  it("кружок чатов молчит на заявках", () => {
    withStore(only(0, 3, 1), <LiveDot scope="messages" />);
    expect(screen.queryByText("Есть новое")).toBeNull();
  });

  // Ключевое: сообщения уже отмечены на соседней вкладке.
  it("кружок кабинета молчит, когда есть только сообщения", () => {
    withStore(only(5, 0, 0), <LiveDot scope="other" />);
    expect(screen.queryByText("Есть новое")).toBeNull();
  });

  it("кружок кабинета зажигают заявки", () => {
    withStore(only(0, 1, 0), <LiveDot scope="other" />);
    expect(screen.getByText("Есть новое")).toBeInTheDocument();
  });

  it("аватарка в шапке зажигается от чего угодно", () => {
    withStore(only(1, 0, 0), <LiveDot scope="all" />);
    expect(screen.getByText("Есть новое")).toBeInTheDocument();
  });

  it("без соединения индикатора нет вовсе", () => {
    withStore(null, <LiveDot scope="all" />);
    expect(screen.queryByText("Есть новое")).toBeNull();
  });
});

describe("число в меню", () => {
  it("показывает счётчик сообщений", () => {
    withStore(only(4, 9, 9), <LiveCount scope="messages" />);
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("на нуле не рисуется", () => {
    withStore(only(0, 5, 5), <LiveCount scope="messages" />);
    expect(screen.queryByText("0")).toBeNull();
  });
});

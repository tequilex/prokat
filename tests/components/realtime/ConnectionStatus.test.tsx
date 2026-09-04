import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConnectionStatus } from "@/components/realtime/ConnectionStatus";
import { RealtimeContext } from "@/components/realtime/context";
import { createRealtimeStore, type ConnectionStatus as Status } from "@/components/realtime/store";
import { content } from "@theme/content";

// Плашка появляется не сразу: штатная ротация по TTL и микро-обрыв длятся
// секунды, и мигание раздражало бы сильнее, чем помогало.

function withStatus(status: Status) {
  const store = createRealtimeStore();
  store.getState().setStatus(status);
  return render(
    <RealtimeContext.Provider value={store}>
      <ConnectionStatus />
    </RealtimeContext.Provider>,
  );
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("статус связи", () => {
  // Аноним сокета не открывает вовсе — жаловаться ему не на что. Раньше он
  // получал статус offline и через шесть секунд видел «связи нет» на любой
  // публичной странице.
  it("анониму ничего не показывает", () => {
    withStatus("idle");
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("на живом соединении молчит", () => {
    withStatus("online");
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(screen.queryByRole("status")).toBeNull();
  });

  // Забаненному связь не положена так же, как анониму, и объяснять её
  // отсутствие нечем. Раньше он видел «Сессия закончилась, обновите страницу» —
  // неправду дважды: сессия у него живая, и перезагрузка ничего не меняет.
  // Время прокручиваем с запасом: провались banned мимо своей ветки, через
  // шесть секунд вылезло бы «связи нет».
  it("забаненному ничего не показывает", () => {
    withStatus("banned");
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("короткий обрыв не показывает — переподключение укладывается в паузу", () => {
    withStatus("offline");
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("затяжной обрыв объясняет тишину словами", () => {
    withStatus("offline");
    act(() => { vi.advanceTimersByTime(7000); });
    expect(screen.getByRole("status")).toHaveTextContent(content.realtime.offline);
  });

  // Само не починится, ждать нечего.
  it("протухшую сессию показывает сразу", () => {
    withStatus("unauthorized");
    expect(screen.getByRole("status")).toHaveTextContent(content.realtime.signedOut);
  });

  // Вкладка от прошлой сборки: действия зовут id, которых на сервере уже нет.
  // Сама не наладится — единственное лечение перезагрузка, и сказать об этом
  // надо, иначе интерфейс просто молча перестаёт реагировать.
  it("устаревшую вкладку просит перезагрузить", () => {
    withStatus("stale");
    expect(screen.getByRole("status")).toHaveTextContent(content.realtime.stale);
  });
});

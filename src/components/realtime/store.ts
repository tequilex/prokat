// Стор реального времени. zustand, а не голый useSyncExternalStore: тот
// требует референциально стабильного снимка, иначе уходит в бесконечный
// ререндер, и это первая ошибка, в которую упирается ручная реализация.
// Менеджера состояния проект по-прежнему не заводит: zustand сам построен на
// useSyncExternalStore, меняется только то, кто пишет обвязку.
//
// Фабрика, а не привычный create() на уровне модуля. Модульный синглтон в
// Node-процессе общий для всех параллельных SSR-запросов, а счётчики
// персональные: засеяли синглтон при рендере — показали число одного человека
// другому.

import { createStore } from "zustand/vanilla";
import type { Counters } from "@/server/actions/realtime";

// Тип берётся из ручки, которая эти числа и отдаёт: вторая декларация
// разошлась бы с ней молча при добавлении счётчика.
export type { Counters } from "@/server/actions/realtime";

export type ConnectionStatus =
  /** Соединения нет, но оно ожидается. */
  | "connecting"
  /** Канал живой. */
  | "online"
  /** Оборвалось, будем переподключаться. */
  | "offline"
  /** Терминальный отказ: сессии нет, бан, чужой Origin. Не переподключаемся. */
  | "unauthorized"
  /** Вкладка осталась от прошлой сборки: id Server Actions в ней уже не
   *  существуют на сервере. Чинится только перезагрузкой страницы. */
  | "stale";

export type RealtimeState = {
  // null означает «неизвестно», и это не то же самое, что нули. Бейдж в этом
  // случае берёт серверный проп — иначе умерший realtime заморозил бы число
  // навсегда, и ни refresh, ни перезагрузка его бы не починили.
  counters: Counters | null;
  status: ConnectionStatus;
  /** Последнее событие по переписке. По нему ThreadView дёргает догон. */
  lastMessage: { threadId: string; messageId: string; at: number } | null;
  /** Отметка широковещательного resync: сервер потерял и вернул LISTEN. */
  resyncAt: number | null;

  setCounters: (counters: Counters) => void;
  setStatus: (status: ConnectionStatus) => void;
  /** Соединение потеряно: счётчики перестают быть достоверными. */
  forgetCounters: () => void;
  pushMessage: (threadId: string, messageId: string) => void;
  markResync: () => void;
};

export function createRealtimeStore() {
  return createStore<RealtimeState>()((set) => ({
    counters: null,
    status: "connecting",
    lastMessage: null,
    resyncAt: null,

    setCounters: (counters) => set({ counters }),
    setStatus: (status) => set({ status }),
    forgetCounters: () => set({ counters: null }),
    pushMessage: (threadId, messageId) =>
      set({ lastMessage: { threadId, messageId, at: Date.now() } }),
    markResync: () => set({ resyncAt: Date.now() }),
  }));
}

export type RealtimeStore = ReturnType<typeof createRealtimeStore>;

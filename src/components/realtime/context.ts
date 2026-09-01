"use client";

// Контекст и хук отдельно от провайдера намеренно: провайдер тянет server
// actions, а его потребители — бейдж в кабинете, лента переписки — нужны и без
// них. Иначе один импорт хука затаскивал бы в клиентский модуль всю цепочку
// auth() → next-auth → next/server, и компонентные тесты падали бы на
// разрешении модулей.

import { createContext, useContext } from "react";
import { useStore } from "zustand";
import {
  createRealtimeStore, type RealtimeState, type RealtimeStore,
} from "@/components/realtime/store";

// Значение по умолчанию — пустой стор, а не null: иначе хук пришлось бы звать
// условно. Модульным состоянием это не становится — писать в него некому:
// пишет только провайдер, а без провайдера его и нет. Нужен компонентам,
// отрендеренным вне дерева (тесты, страницы без сессии).
export const fallbackRealtimeStore = createRealtimeStore();

export const RealtimeContext = createContext<RealtimeStore>(fallbackRealtimeStore);

// Селектором, а не срезом целиком: иначе шапка перерисовывалась бы на каждое
// сообщение — ровно то, ради чего стор и заводился.
export function useRealtime<T>(selector: (state: RealtimeState) => T): T {
  return useStore(useContext(RealtimeContext), selector);
}

"use client";

// Кружок «есть новое» на аватарке: в шапке на десктопе и в таб-баре на мобиле.
//
// Не число, а факт. Числа живут в навигации кабинета, где рядом видно, чего
// именно ждёт человек; здесь важно только позвать внутрь.
//
// Источник — только сокет. Серверное значение означало бы запрос к базе на
// каждой странице каталога, а этого мы избегали намеренно (шапка рендерится
// везде). Цена решения: кружок появляется через секунду после загрузки, а не
// мгновенно, и пропадает, когда соединения нет.

import { useRealtime } from "@/components/realtime/context";
import { content } from "@theme/content";

export function LiveDot() {
  const counters = useRealtime((s) => s.counters);
  const total = counters
    ? counters.messages + counters.notifications + counters.requests
    : 0;
  if (total === 0) return null;

  return (
    <span
      // Кольцо цветом подложки отделяет кружок от аватарки под ним.
      className="absolute -right-0.5 -top-0.5 size-2.5 rounded-pill bg-accent shadow-[0_0_0_2px_var(--color-background)]"
    >
      <span className="sr-only">{content.notifications.dot}</span>
    </span>
  );
}

"use client";

// Живые индикаторы: кружок и число. Оба читают один стор и различаются только
// областью — иначе один и тот же факт показывался бы в двух местах сразу.
//
//   messages — непрочитанные сообщения. Чаты в таб-баре, «Сообщения» в меню.
//   other    — всё остальное неувиденное: решения по заявкам, новые заявки.
//              Кабинет в таб-баре, чтобы не повторять кружок чатов.
//   all      — что угодно. Аватарка в шапке: она вход во всё сразу.
//
// Источник — только сокет. Серверное значение означало бы запрос к базе на
// каждой странице каталога, а шапка рендерится везде. Цена: индикатор
// появляется через секунду после загрузки и гаснет, когда связи нет.

import { useRealtime } from "@/components/realtime/context";
import { badgeCount } from "@/lib/badge-count";
import { content } from "@theme/content";

export type LiveScope = "messages" | "other" | "all";

function useLiveCount(scope: LiveScope): number {
  const counters = useRealtime((s) => s.counters);
  if (!counters) return 0;
  if (scope === "messages") return counters.messages;
  // requests и notifications пересекаются по смыслу — новая заявка попадает в
  // оба. Для кружка это неважно: он про «есть или нет», а не про число.
  if (scope === "other") return counters.notifications + counters.requests;
  return counters.messages + counters.notifications + counters.requests;
}

/** Кружок: только факт. Ставится в контейнер с `relative`. */
export function LiveDot({ scope = "all" }: { scope?: LiveScope }) {
  if (useLiveCount(scope) === 0) return null;
  return (
    <span
      // Кольцо цветом подложки отделяет кружок от того, на чём он висит.
      className="absolute -right-0.5 -top-0.5 size-2.5 rounded-pill bg-accent shadow-[0_0_0_2px_var(--color-background)]"
    >
      <span className="sr-only">{content.notifications.dot}</span>
    </span>
  );
}

/** Число в пилюле — там, где для него есть место: пункт меню, строка таба. */
export function LiveCount({ scope = "messages" }: { scope?: LiveScope }) {
  const badge = badgeCount(useLiveCount(scope));
  if (!badge) return null;
  return (
    <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-accent px-1.5 text-2xs font-bold text-accent-foreground">
      <span aria-hidden="true">{badge.display}</span>
      {/* Голое число рядом с названием раздела вслух звучит как часть названия. */}
      <span className="sr-only">, {badge.label}</span>
    </span>
  );
}

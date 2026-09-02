"use client";

// Живые индикаторы: кружок и число. Оба читают один стор и различаются только
// областью — иначе один и тот же факт показывался бы в двух местах сразу.
//
//   messages — непрочитанные сообщения. Чаты в таб-баре, «Сообщения» в меню.
//   incoming — события по моим вещам: новая заявка, отменённая.
//   mine     — решения по моим заявкам: подтвердили, отклонили и прочее.
//   other    — incoming + mine. Кабинет в таб-баре, чтобы не повторять чаты.
//   all      — что угодно. Аватарка в шапке: она вход во всё сразу.
//
// Точка на аватарке обязана быть объяснима содержимым выпадашки: если она
// горит, а внутри пусто — человек идёт искать причину руками. Поэтому scope
// «all» ровно равен сумме того, что показано пунктами меню.
//
// Источник — только сокет. Серверное значение означало бы запрос к базе на
// каждой странице каталога, а шапка рендерится везде. Цена: индикатор
// появляется через секунду после загрузки и гаснет, когда связи нет.

import { useRealtime } from "@/components/realtime/context";
import { badgeCount } from "@/lib/badge-count";
import { content } from "@theme/content";

export type LiveScope = "messages" | "incoming" | "mine" | "other" | "all";

function useLiveCount(scope: LiveScope): number {
  const counters = useRealtime((s) => s.counters);
  if (!counters) return 0;
  if (scope === "messages") return counters.messages;
  if (scope === "incoming") return counters.incoming;
  if (scope === "mine") return counters.mine;
  if (scope === "other") return counters.incoming + counters.mine;
  return counters.messages + counters.incoming + counters.mine;
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

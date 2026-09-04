"use client";

import { useTransition } from "react";
import { signOut } from "next-auth/react";
import { forgetCityPreference } from "@/server/actions/city";

/* Выход из аккаунта с честным ожиданием. Колбэк асинхронный: React держит
 * переход до конца await, тогда как синхронный вызов снимал бы pending в тот же
 * кадр — и ожидание не успевало бы показаться.
 *
 * Заодно забываем выбранный город: он лежит в куке на год и стоит впереди
 * профиля, иначе следующий человек за этим браузером получил бы чужой город
 * вместо своего. */
export function useSignOut() {
  const [pending, start] = useTransition();
  return {
    pending,
    run: () => start(async () => {
      // Best-effort и строго до signOut (тот редиректит и обратно не вернётся).
      // Без catch отказ экшена — моргнувшая сеть, 500, деплой в эту секунду —
      // отклонил бы промис до вызова signOut: человек нажал «Выйти», индикатор
      // погас, ошибки нет, а он остался залогинен. Забытая кука такой цены не
      // стоит.
      try { await forgetCityPreference(); } catch { /* выход важнее куки */ }
      await signOut({ callbackUrl: "/" });
    }),
  };
}

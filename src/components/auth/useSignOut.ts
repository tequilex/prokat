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
      await forgetCityPreference();
      await signOut({ callbackUrl: "/" });
    }),
  };
}

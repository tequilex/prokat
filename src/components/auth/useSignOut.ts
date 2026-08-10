"use client";

import { useTransition } from "react";
import { signOut } from "next-auth/react";

/* Выход из аккаунта с честным ожиданием. Колбэк асинхронный: React держит
 * переход до конца await, тогда как синхронный вызов снимал бы pending в тот же
 * кадр — и ожидание не успевало бы показаться. */
export function useSignOut() {
  const [pending, start] = useTransition();
  return {
    pending,
    run: () => start(async () => { await signOut({ callbackUrl: "/" }); }),
  };
}

"use client";

// «Назад» из переписки к списку.
//
// Именно назад по истории, а не ссылка на /chat. Ссылка кладёт в историю новую
// запись, и получается стек /chat → /chat/xxx → /chat: кнопка «назад» у
// заголовка раздела (она уже ходит через router.back()) возвращает со списка
// обратно в переписку, оттуда ссылка снова ведёт на список — и человек ходит
// по кругу, не в силах выйти из раздела.
//
// Запасной путь — на случай, когда истории нет: переписку открыли по прямой
// ссылке или после редиректа с карточки объявления. Тот же приём, что у кнопки
// «назад» в AccountShell.

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { content } from "@theme/content";

export function ThreadBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label={content.chat.back}
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push("/chat" as never);
      }}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground md:hidden"
    >
      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

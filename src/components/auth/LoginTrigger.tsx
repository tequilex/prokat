"use client";

// Вход, не уходя со страницы. Остаётся ссылкой на /login: обычный клик
// перехватываем и открываем модалку, а ctrl/cmd-клик, средняя кнопка и работа
// без JS ведут на роут как раньше. Роут никуда не девается — на него приземляют
// middleware, гарды кабинета и ошибки OAuth.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LoginDialog } from "@/components/auth/LoginDialog";

export function LoginTrigger({
  nextAuthProviders,
  vkEnabled,
  canRegisterByEmail,
  className,
  children,
  redirectTo,
  "aria-label": ariaLabel,
}: {
  nextAuthProviders: string[];
  vkEnabled: boolean;
  canRegisterByEmail: boolean;
  className?: string;
  children: React.ReactNode;
  // Куда вести после входа. Не задан — вернём туда, где человек стоял.
  // Задаётся там, где кнопка вела в закрытый раздел: нажал «Заявки» — после
  // входа попадаешь в заявки, а не на текущую страницу.
  redirectTo?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  // Адрес возврата снимаем в момент клика, а не хуками маршрутизатора:
  // useSearchParams в компоненте, который живёт в хедере на каждой странице,
  // требует Suspense-границы при статической генерации.
  const [callbackUrl, setCallbackUrl] = useState("/");
  const linkRef = useRef<HTMLAnchorElement>(null);

  // Обработчик нативный и висит на самой ссылке, а не через onClick React.
  // Причина: nextjs-toploader слушает клики на document и запускает полосу
  // загрузки для любой ссылки. React в App Router слушает там же и может
  // сработать позже, поэтому stopPropagation из onClick не помогает — а с
  // элемента всплытие останавливается гарантированно раньше document.
  useEffect(() => {
    const el = linkRef.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      // Не мешаем открыть в новой вкладке.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      // На самой странице входа окно поверх такой же формы бессмысленно —
      // отдаём обычный переход по ссылке (она несёт ?from=, если он нужен).
      if (window.location.pathname === "/login") return;
      e.preventDefault();
      e.stopPropagation();
      setCallbackUrl(redirectTo ?? window.location.pathname + window.location.search);
      setOpen(true);
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [redirectTo]);

  return (
    <>
      <Link
        ref={linkRef}
        // ?from= нужен для случаев без JS и открытия в новой вкладке: страница
        // входа читает его и возвращает человека туда, куда он шёл.
        href={(redirectTo ? `/login?from=${encodeURIComponent(redirectTo)}` : "/login") as never}
        className={className}
        aria-label={ariaLabel}
      >
        {children}
      </Link>

      <LoginDialog
        open={open}
        onOpenChange={setOpen}
        callbackUrl={callbackUrl}
        nextAuthProviders={nextAuthProviders}
        vkEnabled={vkEnabled}
        canRegisterByEmail={canRegisterByEmail}
      />
    </>
  );
}

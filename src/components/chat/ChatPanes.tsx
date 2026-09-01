"use client";

// Каркас раздела: на десктопе одна панель с двумя внутренними колонками, на
// мобиле — одна колонка, и какая именно видна, решает открытый сегмент.
//
// Фиксированная высота — приём только десктопный. На мобиле её нет намеренно:
// svh и dvh на iOS Safari не реагируют на клавиатуру (layout viewport не
// меняется, браузер вместо этого скроллит документ), и панель фиксированной
// высоты увела бы композер под клавиатуру. Там он остаётся sticky в потоке.
//
// Высота считается от экрана, а не задаётся числом из макета: над панелью стоят
// обложка и герой (≈363px на десктопе), и 672px из макета кончались бы за
// нижней кромкой вьюпорта — композер пришлось бы доскроллвать.

import { useEffect, useRef } from "react";
import { useSelectedLayoutSegment } from "next/navigation";

// Панель занимает экран за вычетом плавающего хедера. sticky здесь не работает
// и не используется: содержащий блок — грид-айтем AccountShell при items-start,
// его высота равна высоте панели, запаса для прилипания нет. Вместо этого при
// открытии переписки панель подскроллвается под хедер (scroll-mt), и композер
// оказывается у нижней кромки.
// Потолок обязателен: без него на большом мониторе панель растягивается на весь
// экран и стоит почти пустой — двум переписками там делать нечего. 40rem это
// примерно два десятка строк списка, дальше высота ничего не добавляет.
const PANEL = "md:h-[min(calc(100svh-var(--header-total)-1.5rem),40rem)] "
  + "md:scroll-mt-[calc(var(--header-total)+0.75rem)]";

export function ChatPanes({
  list, hasThreads, children,
}: {
  list: React.ReactNode;
  /** Пустой список колонкой не занимает места — иначе на десктопе выходили бы
   *  две заглушки рядом, обе про одно и то же. */
  hasThreads: boolean;
  children: React.ReactNode;
}) {
  const threadOpen = useSelectedLayoutSegment() !== null;
  const panelRef = useRef<HTMLDivElement>(null);

  // Открыл переписку — панель встаёт под хедер, обложка уезжает вверх.
  // Только на десктопе: на мобиле панель обычной высоты и скроллить нечего.
  useEffect(() => {
    if (!threadOpen) return;
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    panelRef.current?.scrollIntoView({ block: "start" });
  }, [threadOpen]);

  if (!hasThreads) return <div className="surface overflow-hidden">{children}</div>;

  return (
    <div
      ref={panelRef}
      // overflow-hidden только на десктопе: на мобиле он сделал бы панель
      // scrollport'ом и sticky-композер перестал бы прилипать.
      className={`surface md:grid md:grid-cols-[minmax(0,280px)_1fr] md:overflow-hidden ${PANEL} lg:grid-cols-[320px_1fr]`}
    >
      <div
        className={`min-h-0 min-w-0 flex-col md:flex md:border-r md:border-border ${
          threadOpen ? "hidden md:flex" : "flex"
        }`}
      >
        {list}
      </div>
      <div
        className={`min-h-0 min-w-0 flex-col md:flex ${threadOpen ? "flex" : "hidden md:flex"}`}
      >
        {children}
      </div>
    </div>
  );
}

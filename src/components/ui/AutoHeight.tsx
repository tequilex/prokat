"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/* Плавная смена высоты при подмене содержимого. Нужна там, где в одной карточке
 * живут экраны разного размера (вход → регистрация → выбор сервиса): без этого
 * карточка скачет, а в модалке скачок удваивается — она центрирована, и едут
 * обе границы сразу.
 *
 * Высота снимается ResizeObserver'ом с внутреннего блока, поэтому работает и
 * когда содержимое меняет размер само по себе (появилась ошибка под полем). */
export function AutoHeight({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) setHeight(box.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      // До первого замера высота не задана — иначе при SSR контент схлопнулся бы в ноль.
      style={height === null ? undefined : { height }}
      className={cn(
        "overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none",
        className,
      )}
    >
      <div ref={inner}>{children}</div>
    </div>
  );
}

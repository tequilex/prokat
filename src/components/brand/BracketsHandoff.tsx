"use client";

import { useEffect, useState } from "react";
import { content } from "@theme/content";
import { cn } from "@/lib/utils";

type Phase = "hold" | "out" | "in";

// Экран перехода живёт доли секунды, поэтому цикл начинается сразу с влёта:
// иначе первое слово успевало бы только постоять на месте, и движения не видно.
const HOLD_MS = 200;

/* «Выдача вещи» из брендбука: слово уезжает из скобок вправо и гаснет, скобки
 * в этот момент подаются в стороны. У нас цикл замкнут в пул — обратно влетает
 * уже следующая вещь, так что ожидание перебирает, что можно взять рядом.
 *
 * Первый кадр всегда одинаковый, перемешивание включается после монтирования:
 * иначе сервер и клиент отрисовали бы разные слова. */
export function BracketsHandoff({
  size = 46,
  words = content.loading.words,
  className,
}: {
  size?: number;
  words?: string[];
  className?: string;
}) {
  const [order, setOrder] = useState<string[]>(words);
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>("in");

  useEffect(() => {
    setOrder([...words].sort(() => Math.random() - 0.5));
  }, [words]);

  useEffect(() => {
    if (phase !== "hold") return;
    const t = setTimeout(() => setPhase("out"), HOLD_MS);
    return () => clearTimeout(t);
  }, [phase, i]);

  const stroke = Math.max(1.5, +(size * 0.1).toFixed(2));
  const flare = Math.max(4, Math.round(size * 0.3));
  const gap = Math.round(size * 0.22);
  const grip = Math.round(size * 0.13); // ход скобок: ±6 px при кегле 46
  const fly = Math.round(size * 1.63); // дальность полёта: 75 px при кегле 46

  const open = phase !== "hold";
  const bracket = (side: "left" | "right") => (
    <span
      aria-hidden="true"
      className="block shrink-0 border-current transition-transform duration-300 ease-out"
      style={{
        width: flare,
        height: size,
        borderWidth: stroke,
        [side === "left" ? "borderRightWidth" : "borderLeftWidth"]: 0,
        transform: open ? `translateX(${side === "left" ? -grip : grip}px)` : undefined,
      }}
    />
  );

  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex items-center text-accent", className)}
      style={{ gap }}
    >
      {bracket("left")}

      {/* Все слова лежат стопкой в одной ячейке грида: контейнер берёт ширину
       * самого длинного, и скобки не дёргаются при смене. */}
      <span className="inline-grid overflow-hidden" aria-hidden="true">
        {order.map((w) => (
          <span
            key={w}
            className="invisible col-start-1 row-start-1 whitespace-nowrap font-mark font-bold text-foreground"
            style={{ fontSize: size * 0.75 }}
          >
            {w}
          </span>
        ))}
        <span
          key={`${order[i]}-${phase}`}
          className={cn(
            "col-start-1 row-start-1 whitespace-nowrap text-center font-mark font-bold text-foreground",
            phase === "out" && "handoff-out",
            phase === "in" && "handoff-in",
          )}
          style={{ fontSize: size * 0.75, ["--fly" as string]: `${fly}px` }}
          onAnimationEnd={() => {
            if (phase === "out") {
              setI((n) => (n + 1) % order.length);
              setPhase("in");
            } else if (phase === "in") {
              setPhase("hold");
            }
          }}
        >
          {order[i]}
        </span>
      </span>

      {bracket("right")}
    </span>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { content } from "@theme/content";
import { cn } from "@/lib/utils";

type Phase = "hold" | "out" | "in";

// Экран перехода живёт доли секунды, поэтому цикл начинается сразу с влёта:
// иначе первое слово успевало бы только постоять на месте, и движения не видно.
const HOLD_MS = 200;

/* Геометрия знака в долях кегля СЛОВА: 1em здесь — это оно само.
 *
 * Скобка ростом со слово, а не на треть выше, как на числовом пути. Разница
 * осознанная: у лоадера знак стоит сам по себе и держит экран, а в заголовке
 * он часть строки — рядом со словом того же кегля скобки лоадера читаются
 * раздутыми. Пропорции взяты из макета главной (при кегле 60: скобка 17×60,
 * кант 5, зазор 10).
 *
 * Ход скобок и дальность перелёта — от лоадера: это движение, а не габарит,
 * и оно должно совпадать в обоих местах. */
const EM = {
  stroke: "0.0833em",
  flare: "0.2833em",
  height: "1em",
  gap: "0.1667em",
  grip: "0.1733em",
  fly: "2.1733em",
} as const;

/* «Выдача вещи» из брендбука: слово уезжает из скобок вправо и гаснет, скобки
 * в этот момент подаются в стороны. У нас цикл замкнут в пул — обратно влетает
 * уже следующая вещь, так что ожидание перебирает, что можно взять рядом.
 *
 * Живёт в двух местах: на экранах перехода (LoadingState) и в заголовке
 * главной. Отсюда параметры — кегль, темп и остановка движения: вид у знака
 * один, а условия разные.
 *
 * Первый кадр всегда одинаковый, перемешивание включается после монтирования:
 * иначе сервер и клиент отрисовали бы разные слова. */
export function BracketsHandoff({
  size = 46,
  holdMs = HOLD_MS,
  pauseWhenReduced = false,
  width = "widest",
  words = content.loading.words,
  className,
}: {
  /** Кегль в пикселях либо `"inherit"` — тогда знак считается от кегля строки,
   *  в которую поставлен, следует за ним на резиновом заголовке и берёт
   *  пропорции скобок из макета главной (см. EM). */
  size?: number | "inherit";
  /** Сколько слово стоит на месте между перелётами. */
  holdMs?: number;
  /** Останавливать смену слов под prefers-reduced-motion, а не только гасить
   *  полёт. Нужно там, где знак крутится бесконечно на открытой странице
   *  (WCAG 2.2.2); экран перехода живёт мгновение, и ему это ни к чему. */
  pauseWhenReduced?: boolean;
  /** По чему меряется ячейка слова. `"widest"` — по самому длинному слову
   *  пула: скобки стоят намертво, но короткое слово болтается внутри.
   *  `"word"` — по текущему слову: скобки обнимают его вплотную и переезжают
   *  при смене. Первое для отдельно стоящего знака, второе — для заголовка,
   *  где скобки читаются как часть слова, а не как пустая рамка вокруг него. */
  width?: "widest" | "word";
  words?: string[];
  className?: string;
}) {
  const [order, setOrder] = useState<string[]>(words);
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>("in");
  const [paused, setPaused] = useState(false);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [measured, setMeasured] = useState<number | null>(null);
  const [fontsReady, setFontsReady] = useState(false);

  // Мерку снимаем после каждой смены слова и ещё раз, когда доедут шрифты:
  // до их загрузки строка набрана запасной гарнитурой и меряется не тем.
  useEffect(() => {
    if (width !== "word") return;
    const el = measureRef.current;
    if (el) setMeasured(el.getBoundingClientRect().width);
  }, [width, i, order, size, fontsReady]);

  useEffect(() => {
    if (width !== "word") return;
    let alive = true;
    void document.fonts?.ready.then(() => alive && setFontsReady(true));
    return () => { alive = false; };
  }, [width]);

  useEffect(() => {
    setOrder([...words].sort(() => Math.random() - 0.5));
  }, [words]);

  useEffect(() => {
    if (!pauseWhenReduced) return;
    setPaused(Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches));
  }, [pauseWhenReduced]);

  useEffect(() => {
    if (phase !== "hold" || paused) return;
    const t = setTimeout(() => setPhase("out"), holdMs);
    return () => clearTimeout(t);
  }, [phase, i, holdMs, paused]);

  const em = size === "inherit";
  // Числовой путь оставлен ровно таким, каким был: экран перехода не должен
  // сдвинуться ни на пиксель из-за того, что знак научился резиновому кеглю.
  const g = em
    ? EM
    : {
        stroke: `${Math.max(1.5, +(size * 0.1).toFixed(2))}px`,
        flare: `${Math.max(4, Math.round(size * 0.3))}px`,
        height: `${size}px`,
        gap: `${Math.round(size * 0.22)}px`,
        grip: `${Math.round(size * 0.13)}px`,
        fly: `${Math.round(size * 1.63)}px`,
      };

  const open = phase !== "hold";
  const bracket = (side: "left" | "right") => (
    <span
      aria-hidden="true"
      className="block shrink-0 border-current transition-transform duration-300 ease-out"
      style={{
        width: g.flare,
        height: g.height,
        borderWidth: g.stroke,
        [side === "left" ? "borderRightWidth" : "borderLeftWidth"]: 0,
        transform: open ? `translateX(${side === "left" ? "-" : ""}${g.grip})` : undefined,
      }}
    />
  );

  const wordStyle = { fontSize: em ? undefined : `${size * 0.75}px` };

  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-flex max-w-full items-center text-accent", className)}
      style={{ gap: g.gap }}
    >
      {bracket("left")}

      {/* Мерка для width="word": то же слово тем же кеглем, но вне потока —
       * ширину надо знать числом, иначе ячейке нечего анимировать. Ширина по
       * содержимому у грид-ячейки меняется скачком, и скобка прыгала. */}
      {width === "word" && (
        <span
          ref={measureRef}
          aria-hidden="true"
          className="invisible absolute left-0 top-0 whitespace-nowrap font-mark font-bold"
          style={wordStyle}
        >
          {order[i]}
        </span>
      )}

      {/* Все слова лежат стопкой в одной ячейке грида: контейнер берёт ширину
       * самого длинного, и скобки не дёргаются при смене. При width="word"
       * распорки нет — ячейка едет за текущим словом, и едет она плавно:
       * ширина задана числом и переходит за то же время, что летит слово. */}
      <span
        className={cn(
          "inline-grid min-w-0 overflow-hidden",
          width === "word" && "transition-[width] duration-300 ease-out motion-reduce:transition-none",
        )}
        style={width === "word" && measured !== null ? { width: measured } : undefined}
        aria-hidden="true"
      >
        {width === "widest" && order.map((w) => (
          <span
            key={w}
            className="invisible col-start-1 row-start-1 whitespace-nowrap font-mark font-bold text-foreground"
            style={{ fontSize: em ? undefined : `${size * 0.75}px` }}
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
          style={{
            fontSize: em ? undefined : `${size * 0.75}px`,
            ["--fly" as string]: g.fly,
          }}
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

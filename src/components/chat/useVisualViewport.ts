"use client";

// Размеры видимой части экрана — в CSS-переменные --vvh и --vvt.
//
// Зачем не svh/dvh и не арифметика «окно минус клавиатура»:
//
// 1. На iOS клавиатура НЕ меняет layout viewport. svh и dvh о ней не знают, и
//    экран, посчитанный от них, остаётся прежней высоты — поле ввода уезжает
//    под клавиатуру, а Safari вместо этого прокручивает документ.
// 2. Считать клавиатуру как window.innerHeight - visualViewport.height нельзя:
//    innerHeight на iOS сам меняется, когда Safari прячет нижнюю панель. Из-за
//    этого отступ то завышался, то не возвращался в ноль при закрытии.
//
// Поэтому берём у visualViewport готовые значения: высоту видимой части и её
// смещение сверху. Элемент с position: fixed позиционируется от layout
// viewport, а не от видимой части, поэтому при открытой клавиатуре его надо
// сдвинуть на offsetTop — иначе он уезжает за верхнюю кромку.
//
// Запасные значения переменных заданы в globals.css на :root, а не через
// fallback внутри var(): запятая в произвольном значении Tailwind ломает разбор
// класса, и правило молча не генерируется.

import { useEffect } from "react";

export function useVisualViewport(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const root = document.documentElement;
    let frame = 0;

    const apply = () => {
      cancelAnimationFrame(frame);
      // Через кадр: Safari шлёт resize и scroll пачкой, а промежуточные
      // значения во время анимации клавиатуры дают дёрганье.
      frame = requestAnimationFrame(() => {
        root.style.setProperty("--vvh", `${Math.round(vv.height)}px`);
        root.style.setProperty("--vvt", `${Math.round(vv.offsetTop)}px`);
      });
    };

    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
      root.style.removeProperty("--vvh");
      root.style.removeProperty("--vvt");
    };
  }, []);
}

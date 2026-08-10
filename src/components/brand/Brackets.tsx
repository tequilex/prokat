import { cn } from "@/lib/utils";

/* Пустые скобки — служебный знак: ожидание, пустое состояние, зона загрузки
 * фото. От скобок логотипа отличаются пропорциями: штрих толще (0,1 против
 * 0,08), вылет и зазор шире (0,3 против 0,26 и 0,14) — служебный знак читается
 * отдельно от бренда.
 *
 * running — ожидание: между скобками ходит блик, и та скобка, к которой он
 * подбежал, подаётся в сторону. Двигается содержимое, скобки только реагируют;
 * ничего не вращается. Всё останавливается при prefers-reduced-motion. */
export function Brackets({
  size = 30,
  running = false,
  className,
}: {
  size?: number;
  running?: boolean;
  /** Цвет задаётся текстом (currentColor): по умолчанию охра, но внутри цветной
   *  кнопки достаточно передать text-current. */
  className?: string;
}) {
  const stroke = Math.max(1.5, +(size * 0.1).toFixed(2));
  const flare = Math.max(4, Math.round(size * 0.3));
  const gap = Math.round(size * (running ? 0.22 : 0.3));

  // Дорожка блика и ход реакции — от кегля, иначе в кнопке скобки дрожат,
  // а на экране загрузки движение теряется.
  const track = Math.round(size * 0.75);
  const dot = Math.max(3, Math.round(track * 0.35));
  const trackH = Math.max(3, Math.round(size * 0.18));
  const amp = Math.max(1.5, +(size * 0.09).toFixed(1));

  const bracket = (side: "left" | "right") => (
    <span
      aria-hidden="true"
      className="block shrink-0 border-current"
      style={{
        width: flare,
        height: size,
        borderWidth: stroke,
        [side === "left" ? "borderRightWidth" : "borderLeftWidth"]: 0,
      }}
    />
  );

  return (
    <span
      className={cn("inline-flex items-center text-accent", running && "brackets-react", className)}
      style={{ gap, ...(running ? ({ "--amp": `${amp}px` } as React.CSSProperties) : null) }}
    >
      {bracket("left")}
      {running && (
        <span
          aria-hidden="true"
          className="brackets-run relative shrink-0 overflow-hidden rounded-pill bg-current/15"
          style={{ width: track, height: trackH, ["--dot" as string]: `${dot}px` }}
        />
      )}
      {bracket("right")}
    </span>
  );
}

import { cn } from "@/lib/utils";

/* Знак inrenta: слово между двумя нарисованными скобками. Скобки — не глиф
 * шрифта, а два бокса с бордером, поэтому пропорции жёстко привязаны к кеглю:
 * толщина 0,08 · высота 0,95 · вылет 0,26 · зазор 0,14 от размера. Ниже 14 px
 * толщина фиксируется на 1,5 px, а зазор растёт — иначе знак слипается.
 *
 * Цвет скобок — акцент темы (--color-primary). В брендбуке скобки охряные;
 * здесь они берут текущий токен, поэтому переедут на охру сами, если тема
 * когда-нибудь сменится. */
export function Logo({
  size = 20,
  word = "inrenta",
  showWord = true,
  className,
  bracketClassName = "border-primary",
}: {
  size?: number;
  word?: string;
  showWord?: boolean;
  className?: string;
  /** Цвет скобок. Переопределяется там, где скобки работают иконкой и должны
   *  гаснуть вместе с остальной навигацией (таб-бар). */
  bracketClassName?: string;
}) {
  const stroke = Math.max(1.5, +(size * 0.08).toFixed(2));
  const height = Math.round(size * 0.95);
  const flare = Math.max(4, Math.round(size * 0.26));
  const gap = Math.round(size * (size < 14 ? 0.18 : 0.14));
  const tracking = size >= 40 ? "-0.035em" : size >= 24 ? "-0.03em" : "-0.02em";

  const bracket = (side: "left" | "right") => (
    <span
      aria-hidden="true"
      className={cn("block shrink-0", bracketClassName)}
      style={{
        width: flare,
        height,
        borderWidth: stroke,
        [side === "left" ? "borderRightWidth" : "borderLeftWidth"]: 0,
      }}
    />
  );

  return (
    <span
      className={cn("inline-flex items-center leading-none", className)}
      style={{ gap }}
      aria-label={word}
    >
      {bracket("left")}
      {showWord && (
        <span
          className="font-mark font-bold"
          style={{ fontSize: size, lineHeight: 1, letterSpacing: tracking }}
        >
          {word}
        </span>
      )}
      {bracket("right")}
    </span>
  );
}

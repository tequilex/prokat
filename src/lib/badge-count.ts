// Правило отображения числа в бейдже навигации. Вынесено, потому что бейдж
// нарисован дважды разной разметкой — в сайдбаре (AccountShell) и в мобильном
// хабе (CabinetHub), — и разъехаться этим двум нельзя.

const MAX_DISPLAY = 99;

export type BadgeCount = {
  /** Что видно глазами: два знака максимум, дальше «99+». */
  display: string;
  /** Что читает скринридер: точное число, без потолка. */
  label: string;
};

export function badgeCount(n: number | undefined): BadgeCount | null {
  if (!n || n <= 0) return null;
  return {
    display: n > MAX_DISPLAY ? `${MAX_DISPLAY}+` : String(n),
    label: `новых: ${n}`,
  };
}

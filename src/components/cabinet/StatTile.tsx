import { cn } from "@/lib/utils";

export interface Stat {
  value: string | number;
  label: string;
  /** Показатель про предмет и его состояние — занятость, просмотры вещей. */
  accent?: boolean;
}

/* Метрики кабинета: каждая — отдельная карточка. На узком экране они идут
 * столбцом строками (подпись слева, число справа) — четыре квадрата в ряд там
 * не помещаются. С планшета встают плитками в ряд, числом вверх. */
export function Stats({ items }: { items: Stat[] }) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
      {items.map((it) => (
        <div
          key={it.label}
          className="surface flex items-center justify-between gap-3 px-4 py-3 sm:min-w-0 sm:flex-1 sm:flex-col sm:items-start sm:gap-1 sm:p-4"
        >
          <span className="font-mono text-2xs uppercase leading-tight tracking-mono text-muted-foreground sm:order-2">
            {it.label}
          </span>
          <span
            className={cn(
              "font-mark text-xl font-bold sm:order-1 sm:text-2xl",
              it.accent && "text-accent",
            )}
          >
            {it.value}
          </span>
        </div>
      ))}
    </div>
  );
}

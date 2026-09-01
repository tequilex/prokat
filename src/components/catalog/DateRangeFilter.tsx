"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DayPicker, type DateRange } from "react-day-picker";
import { ru } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { CalendarDays, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { Button } from "@/components/ui/button";
import { formatDayMonthShort } from "@/lib/catalog/dates";

function fmt(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function parse(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

// Фильтр «свободно в эти даты» в шапке выдачи. Календарь без занятости: здесь
// выбирают период, а свободу в нём считает сервер по всем позициям сразу.
//
// Поповер, а не модалка: календарь — вспомогательный выбор рядом с кнопкой,
// затемнять ради него всю страницу незачем.
//
// Диапазон применяется только целиком: одна выбранная граница ничего не
// фильтрует, иначе выдача менялась бы на полпути и объяснить это было бы нечем.
export function DateRangeFilter({
  from, to, resetHref, today,
}: {
  from?: string;
  to?: string;
  /** Адрес без дат — готовой строкой: функцию клиенту через границу не передать. */
  resetHref: string;
  today: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Закрываем при прокрутке страницы. Radix держит поповер приклеенным к
  // кнопке, поэтому при скролле он уезжает вверх и наползает на липкий хедер:
  // тот ниже по z-index и накрыть поповер не может. Проще закрыть, чем городить
  // границы столкновений под высоту хедера.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, [open]);
  const [range, setRange] = useState<DateRange | undefined>(
    from && to ? { from: parse(from), to: parse(to) } : undefined,
  );

  const active = Boolean(from && to);
  const label = active ? `${formatDayMonthShort(from!)} — ${formatDayMonthShort(to!)}` : "Любые даты";

  const apply = () => {
    if (!range?.from || !range?.to) return;
    const url = new URL(window.location.href);
    url.searchParams.set("from", fmt(range.from));
    url.searchParams.set("to", fmt(range.to));
    url.searchParams.delete("page");
    setOpen(false);
    router.push(`${url.pathname}${url.search}` as never);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex h-8 items-center gap-2 rounded-sm border px-3 text-sm transition-colors ${
            active
              ? "border-selected bg-selected text-selected-foreground"
              : "border-border bg-background text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent>
        {/* Ширина обязательна: .rdp-theme тянет месяц и сетку на 100% контейнера
          * (он писался под карточку брони с известной шириной). У поповера
          * своей ширины нет, и без этого календарь растягивается во всю
          * доступную и рассыпается. */}
        <div className="rdp-theme w-[19rem]">
          <DayPicker
            mode="range"
            locale={ru}
            selected={range}
            onSelect={setRange}
            disabled={{ before: parse(today) }}
            defaultMonth={range?.from ?? parse(today)}
          />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button type="button" size="sm" className="flex-1" onClick={apply}
            disabled={!range?.from || !range?.to}>
            Показать
          </Button>
          {active && (
            <Button asChild variant="ghost" size="sm">
              <a href={resetHref}>
                <X className="mr-1 h-4 w-4" aria-hidden="true" />
                Сбросить
              </a>
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

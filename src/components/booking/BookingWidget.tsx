"use client";

// Точка брони на странице позиции: выбор дат/количества + кнопка.
// Выбор синхронизируется в URL query (history.replaceState, без перезагрузки),
// поэтому переживает OAuth-redirect: LoginDialog отправляет провайдеру
// callbackUrl = текущий path+query, и после входа пользователь возвращается
// на тот же шаг с теми же датами.
//
// Отправка заявки появится следующим этапом: для авторизованного пользователя
// кнопка пока ведёт в состояние «скоро».

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoginDialog } from "@/components/auth/LoginDialog";
import {
  buildBookingQuery, rentalDaysCount, type BookingSelection,
} from "@/lib/booking/params";
import { unavailableDates, type DayLoad } from "@/lib/catalog/availability";
import { formatDayMonth } from "@/lib/catalog/dates";
import { formatPrice } from "@/lib/catalog/format";

export interface BookingWidgetProps {
  pathname: string;             // /kazan/prokatmaster/perforator
  initial: BookingSelection;    // уже провалидировано сервером (parseBookingParams)
  today: string;
  maxDate: string;              // горизонт бронирования
  // Занятость по дням на весь горизонт (plain object: Map не проходит RSC-границу).
  availability: Record<string, DayLoad>;
  quantity: number;
  priceDay: number | null;
  priceWeek: number | null;
  priceHour: number | null;
  depositLabel: string;
  providerName: string;
  providerHref: string;
  providerAddress: string | null;
  isAuthed: boolean;
  nextAuthProviders: string[];
  vkEnabled: boolean;
  isDev: boolean;
}

export function BookingWidget(props: BookingWidgetProps) {
  const [sel, setSel] = useState<BookingSelection>(props.initial);
  const [loginOpen, setLoginOpen] = useState(false);

  // to не может быть раньше from: сдвигаем автоматически.
  const set = (patch: Partial<BookingSelection>) => {
    setSel((cur) => {
      const next = { ...cur, ...patch };
      if (next.to < next.from) next.to = next.from;
      return next;
    });
  };

  const query = buildBookingQuery(sel, props.today);
  const callbackUrl = query ? `${props.pathname}?${query}` : props.pathname;

  useEffect(() => {
    window.history.replaceState(null, "", callbackUrl);
  }, [callbackUrl]);

  const days = rentalDaysCount(sel);
  const estimate = useMemo(() => {
    if (props.priceDay === null) return null;
    return props.priceDay * days * sel.qty;
  }, [props.priceDay, days, sel.qty]);

  // Дни выбранного диапазона, где не набирается qty свободных единиц.
  // Нативный date-input не умеет блокировать отдельные даты, поэтому
  // конфликт ловим после выбора: сообщение + заблокированная кнопка.
  const conflicts = useMemo(() => {
    const map = new Map(Object.entries(props.availability));
    return unavailableDates(props.quantity, map, sel.from, sel.to, sel.qty);
  }, [props.availability, props.quantity, sel]);
  const hasConflict = conflicts.length > 0;

  const onBook = () => {
    if (hasConflict) return;
    if (!props.isAuthed) setLoginOpen(true);
    // Авторизованный флоу (форма заявки) — следующий этап.
  };

  const bookButton = (extra: string) => props.isAuthed ? (
    <Button className={extra} disabled title="Отправка заявок откроется совсем скоро">
      Заявки скоро
    </Button>
  ) : (
    <Button className={extra} onClick={onBook} disabled={hasConflict}>Забронировать</Button>
  );

  const conflictMessage = hasConflict ? (
    <p className="text-sm text-destructive" role="alert">
      {sel.qty > 1 ? `Нет ${sel.qty} свободных единиц` : "Занято"}:{" "}
      {conflicts.map(formatDayMonth).join(", ")}. Выберите другие даты
      {props.quantity > 1 && sel.qty > 1 ? " или меньшее количество" : ""}.
    </p>
  ) : null;

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-4">
        <dl className="flex flex-col gap-2 text-sm">
          {props.priceDay !== null && (
            <div className="flex items-baseline justify-between">
              <dt className="text-muted-foreground">Сутки</dt>
              <dd className="text-lg font-semibold">{formatPrice(props.priceDay)}</dd>
            </div>
          )}
          {props.priceWeek !== null && (
            <div className="flex items-baseline justify-between">
              <dt className="text-muted-foreground">Неделя</dt>
              <dd className="font-medium">{formatPrice(props.priceWeek)}</dd>
            </div>
          )}
          {props.priceHour !== null && (
            <div className="flex items-baseline justify-between">
              <dt className="text-muted-foreground">Час</dt>
              <dd className="font-medium">{formatPrice(props.priceHour)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-border pt-2">
            <dt className="text-muted-foreground">Залог</dt>
            <dd>{props.depositLabel}</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
              С
              <input
                type="date" required value={sel.from}
                min={props.today} max={props.maxDate}
                onChange={(e) => e.target.value && set({ from: e.target.value })}
                className="h-10 rounded-md border border-border bg-background px-2 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
              По (включительно)
              <input
                type="date" required value={sel.to}
                min={sel.from} max={props.maxDate}
                onChange={(e) => e.target.value && set({ to: e.target.value })}
                className="h-10 rounded-md border border-border bg-background px-2 text-sm text-foreground"
              />
            </label>
          </div>

          {props.quantity > 1 && (
            <label className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
              Количество
              <select
                value={sel.qty}
                onChange={(e) => set({ qty: Number(e.target.value) })}
                className="h-10 w-20 rounded-md border border-border bg-background px-2 text-sm text-foreground"
              >
                {Array.from({ length: props.quantity }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
          )}

          {estimate !== null && (
            <p className="text-sm text-muted-foreground">
              {days} дн. × {sel.qty} шт. ≈ <span className="font-medium text-foreground">{formatPrice(estimate)}</span>
            </p>
          )}

          {conflictMessage}

          {bookButton("mt-1 hidden w-full md:inline-flex")}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Прокат{" "}
          <Link href={props.providerHref as never} className="text-foreground hover:underline underline-offset-2">
            {props.providerName}
          </Link>
          {props.providerAddress ? ` · ${props.providerAddress}` : null}
        </p>
      </div>

      {/* Mobile: прилипшая к низу кнопка */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-1">
          <span className="text-sm font-semibold">
            {estimate !== null
              ? `≈ ${formatPrice(estimate)}`
              : props.priceDay !== null ? `${formatPrice(props.priceDay)}/сутки` : ""}
          </span>
          {bookButton("")}
        </div>
      </div>

      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        callbackUrl={callbackUrl}
        nextAuthProviders={props.nextAuthProviders}
        vkEnabled={props.vkEnabled}
        isDev={props.isDev}
      />
    </>
  );
}

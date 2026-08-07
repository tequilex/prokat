"use client";

// Форма заявки на бронь (для авторизованного): телефон (обязателен,
// предзаполняется из профиля после первой заявки), комментарий, honeypot.
// Успех — подтверждение со ссылкой в «Мои заявки»; сервис подсказывает,
// что владелец созвонится для подтверждения.

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBookingRequest } from "@/server/actions/booking";
import type { BookingSelection } from "@/lib/booking/params";
import { rentalDaysCount } from "@/lib/booking/params";
import { formatDayMonth } from "@/lib/catalog/dates";
import { formatPrice } from "@/lib/catalog/format";

function humanError(code: string): string {
  if (code.startsWith("rate_limited:")) {
    return `Слишком много заявок. Попробуйте через ${code.split(":")[1]} с.`;
  }
  if (code.startsWith("dates_taken:")) {
    return "Выбранные даты уже заняты — обновите страницу и выберите другие.";
  }
  if (code === "listing_not_found") return "Позиция больше не доступна.";
  if (code === "auth_required") return "Войдите, чтобы отправить заявку.";
  return code.length < 200 ? code : "Не получилось отправить заявку.";
}

export function BookingFormDialog({
  open, onOpenChange, listingId, listingTitle, sel, priceDay, initialPhone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  listingTitle: string;
  sel: BookingSelection;
  priceDay: number | null;
  initialPhone: string;
}) {
  const [phone, setPhone] = useState(initialPhone);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const days = rentalDaysCount(sel);
  const estimate = priceDay !== null ? priceDay * days * sel.qty : null;
  const period = sel.from === sel.to
    ? formatDayMonth(sel.from)
    : `${formatDayMonth(sel.from)} — ${formatDayMonth(sel.to)}`;

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const website = new FormData(e.currentTarget).get("website")?.toString() ?? "";
    setError(null);
    startTransition(async () => {
      const r = await createBookingRequest({
        listingId,
        from: sel.from,
        to: sel.to,
        qty: String(sel.qty),
        phone,
        comment,
        website,
      });
      if (r.ok) setDone(true);
      else setError(humanError(r.error));
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-lg">
          {done ? (
            <>
              <Dialog.Title className="font-display text-xl">Заявка отправлена</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-muted-foreground">
                Владелец получил заявку и обычно созванивается для
                подтверждения. Если ответа нет 24 часа, заявка истечёт автоматически.
              </Dialog.Description>
              <Button asChild className="mt-5 w-full">
                <Link href={"/requests" as never}>Мои заявки</Link>
              </Button>
            </>
          ) : (
            <>
              <Dialog.Title className="font-display text-xl">Заявка на бронь</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                {listingTitle}: {period}
                {sel.qty > 1 ? `, ${sel.qty} шт.` : ""}
                {estimate !== null ? ` · ≈ ${formatPrice(estimate)}` : ""}
              </Dialog.Description>

              <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  Телефон для связи
                  <input
                    type="tel" required value={phone} autoComplete="tel"
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 900 000-00-00"
                    className="h-11 rounded-md border border-border bg-background px-3 text-foreground"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Комментарий (необязательно)
                  <textarea
                    value={comment} maxLength={500} rows={3}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Например: нужен к 9 утра"
                    className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
                  />
                </label>
                {/* Honeypot: скрыто от людей, боты заполняют */}
                <input
                  type="text" name="website" tabIndex={-1} autoComplete="off"
                  className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden="true"
                />

                {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

                <Button type="submit" pending={pending} className="mt-1 w-full">
                  Отправить заявку
                </Button>
                <p className="text-xs text-muted-foreground">
                  Оплата и залог — напрямую с владельцем, сервис платежи не проводит.
                </p>
              </form>
            </>
          )}

          <Dialog.Close asChild>
            <button
              type="button" aria-label="Закрыть"
              className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

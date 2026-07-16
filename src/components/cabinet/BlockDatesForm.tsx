"use client";

// Ручное закрытие дат («сдал по телефону», «в ремонте»): диапазон + сколько
// единиц закрыть. 0 = открыть даты обратно.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setBlockedDates } from "@/server/actions/owner";

const INPUT = "h-10 rounded-md border border-border bg-background px-2 text-sm text-foreground";

export function BlockDatesForm({
  listingId, quantity, today, maxDate,
}: {
  listingId: string;
  quantity: number;
  today: string;
  maxDate: string;
}) {
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [qty, setQty] = useState(quantity);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await setBlockedDates(listingId, from, to, qty);
      if (!r.ok) setError("Не получилось сохранить — проверьте даты.");
      else router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        С
        <input type="date" required value={from} min={today} max={maxDate}
          onChange={(e) => { if (e.target.value) { setFrom(e.target.value); if (to < e.target.value) setTo(e.target.value); } }}
          className={INPUT} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        По (включительно)
        <input type="date" required value={to} min={from} max={maxDate}
          onChange={(e) => e.target.value && setTo(e.target.value)}
          className={INPUT} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Закрыть единиц
        <select value={qty} onChange={(e) => setQty(Number(e.target.value))} className={INPUT}>
          {Array.from({ length: quantity + 1 }, (_, n) => (
            <option key={n} value={n}>{n === 0 ? "0 — открыть" : n}</option>
          ))}
        </select>
      </label>
      <Button type="submit" size="sm" pending={pending}>Применить</Button>
      {error && <p className="w-full text-sm text-destructive" role="alert">{error}</p>}
    </form>
  );
}

// Календарь занятости по позициям: выбор позиции (?listing=), сетка на
// 6 недель (booked + blocked) и форма ручного закрытия дат.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuthState } from "@/lib/auth/guard";
import { getOwnerListings } from "@/server/owner";
import { getAvailabilityRows } from "@/server/catalog";
import { addDaysStr, todayStr } from "@/lib/catalog/dates";
import type { AvailabilityMap } from "@/lib/catalog/availability";
import { BOOKING_HORIZON_DAYS } from "@/lib/booking/params";
import { FullCalendar } from "@/components/catalog/AvailabilityCalendar";
import { BlockDatesForm } from "@/components/cabinet/BlockDatesForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Календарь занятости", robots: { index: false } };

export default async function CabinetCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ listing?: string }>;
}) {
  const session = await requireAuthState();
  if (!session) redirect("/login?from=/cabinet");

  const items = (await getOwnerListings(session.user.id)).filter((l) => l.status !== "archived");
  if (items.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">Сначала добавьте позиции.</p>;
  }

  const { listing: listingParam } = await searchParams;
  const selected = items.find((l) => l.id === listingParam) ?? items[0];

  const from = todayStr();
  const rows = await getAvailabilityRows([selected.id], from, addDaysStr(from, 41));
  const map: AvailabilityMap = new Map(
    rows.map((r) => [r.date, { bookedQty: r.bookedQty, blockedQty: r.blockedQty }]),
  );

  return (
    <section aria-label="Календарь занятости">
      <nav aria-label="Позиции" className="mb-4 flex flex-wrap gap-2">
        {items.map((l) => (
          <Link
            key={l.id}
            href={`/cabinet/calendar?listing=${l.id}` as never}
            className={`rounded-pill border px-3 py-1.5 text-sm ${
              l.id === selected.id
                ? "border-accent bg-accent/10 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {l.title}
          </Link>
        ))}
      </nav>

      <div className="max-w-xl">
        <FullCalendar quantity={selected.quantity} map={map} from={from} weeks={6} />
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">
          Закрыть даты вручную — «сдал по телефону», «в ремонте»
        </h2>
        <BlockDatesForm
          listingId={selected.id}
          quantity={selected.quantity}
          today={from}
          maxDate={addDaysStr(from, BOOKING_HORIZON_DAYS)}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Закрытие выставляет число недоступных единиц на каждый день диапазона
          (подтверждённые брони считаются отдельно). «0 — открыть» снимает закрытие.
        </p>
      </div>
    </section>
  );
}

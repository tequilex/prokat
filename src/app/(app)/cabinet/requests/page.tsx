import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthState } from "@/lib/auth/guard";
import { getOwnerRequests } from "@/server/owner";
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from "@/lib/booking/status-labels";
import type { BookingStatus } from "@/lib/catalog/booking-status";
import { formatDayMonth } from "@/lib/catalog/dates";
import { RequestActions } from "@/components/cabinet/RequestActions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Заявки", robots: { index: false } };

export default async function CabinetRequestsPage() {
  const session = await requireAuthState();
  if (!session) redirect("/login?from=/cabinet");

  const rows = await getOwnerRequests(session.user.id);

  return (
    <section aria-label="Заявки на бронь">
      {rows.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          Заявок пока нет. Они появятся здесь, когда клиенты выберут даты у ваших позиций.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map(({ request, listingTitle, customerName, customerUsername }) => {
            const status = request.status as BookingStatus;
            const period = request.dateFrom === request.dateTo
              ? formatDayMonth(request.dateFrom)
              : `${formatDayMonth(request.dateFrom)} — ${formatDayMonth(request.dateTo)}`;
            return (
              <li key={request.id} className={`rounded-lg border bg-card p-4 ${status === "new" ? "border-primary" : "border-border"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{listingTitle}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {period}
                      {request.qty > 1 ? ` · ${request.qty} шт.` : ""}
                      {" · "}{customerName ?? `@${customerUsername ?? "клиент"}`}
                    </p>
                  </div>
                  <span className={`rounded-pill px-2.5 py-1 text-xs font-medium ${STATUS_BADGE_CLASSES[status]}`}>
                    {STATUS_LABELS[status]}
                  </span>
                </div>

                <p className="mt-2 text-sm">
                  Телефон клиента:{" "}
                  <a href={`tel:${request.customerPhone.replace(/[^+\d]/g, "")}`} className="font-medium hover:underline">
                    {request.customerPhone}
                  </a>
                  <span className="ml-2 text-xs text-muted-foreground">
                    Созвонитесь с клиентом, чтобы согласовать детали.
                  </span>
                </p>
                {request.customerComment && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Комментарий клиента: {request.customerComment}
                  </p>
                )}
                {status === "new" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Действует до {request.expiresAt.toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })},
                    потом истечёт автоматически.
                  </p>
                )}

                <div className="mt-3">
                  <RequestActions requestId={request.id} status={status} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

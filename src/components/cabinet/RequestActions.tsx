"use client";

// Действия владельца по заявке. Критический путь «подтвердить» — один тап;
// комментарий (например, предложить другие даты) — опционально, раскрывается.

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  completeRequest, confirmRequest, declineRequest, noShowRequest,
} from "@/server/actions/owner";
import { field } from "@/components/ui/field";
import type { BookingStatus } from "@/lib/catalog/booking-status";

function humanError(code: string): string {
  if (code.startsWith("dates_taken:")) {
    return "Эти даты уже заняты (другая бронь или закрытие) — отклоните заявку или освободите календарь.";
  }
  if (code === "bad_status") return "Статус уже изменился — обновите страницу.";
  return "Не получилось — обновите страницу.";
}

export function RequestActions({ requestId, status }: { requestId: string; status: BookingStatus }) {
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setError(humanError(r.error ?? ""));
    });
  };

  if (status === "new") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" pending={pending} onClick={() => run(() => confirmRequest(requestId, comment))}>
            Подтвердить
          </Button>
          <Button size="sm" variant="outline" pending={pending}
            onClick={() => run(() => declineRequest(requestId, comment))}>
            Отклонить
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowComment((s) => !s)}>
            {showComment ? "Скрыть комментарий" : "+ Комментарий"}
          </Button>
        </div>
        {showComment && (
          <textarea
            value={comment} maxLength={500} rows={2}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Клиент увидит этот комментарий — например, предложите другие даты"
            className={`${field} px-3 py-2 text-sm`}
          />
        )}
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      </div>
    );
  }

  if (status === "confirmed") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" pending={pending} onClick={() => run(() => completeRequest(requestId))}>
            Завершена
          </Button>
          <Button size="sm" variant="ghost" pending={pending} onClick={() => run(() => noShowRequest(requestId))}>
            Неявка
          </Button>
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      </div>
    );
  }

  return null;
}

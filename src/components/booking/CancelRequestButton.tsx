"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelBookingRequest } from "@/server/actions/booking";

export function CancelRequestButton({ requestId }: { requestId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onCancel = () => {
    if (!window.confirm("Отменить заявку?")) return;
    startTransition(async () => {
      const r = await cancelBookingRequest(requestId);
      if (!r.ok) setError("Не получилось отменить — обновите страницу.");
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" pending={pending} onClick={onCancel}>
        Отменить
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

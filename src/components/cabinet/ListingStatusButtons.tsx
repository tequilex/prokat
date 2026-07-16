"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setListingStatus } from "@/server/actions/owner";

export function ListingStatusButtons({
  listingId, status,
}: {
  listingId: string;
  status: "active" | "hidden" | "archived" | "on_moderation";
}) {
  const [pending, startTransition] = useTransition();
  const run = (next: "active" | "hidden" | "archived") =>
    startTransition(async () => { await setListingStatus(listingId, next); });

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "active" && (
        <Button size="sm" variant="outline" pending={pending} onClick={() => run("active")}>
          Показать
        </Button>
      )}
      {status === "active" && (
        <Button size="sm" variant="outline" pending={pending} onClick={() => run("hidden")}>
          Скрыть
        </Button>
      )}
      {status !== "archived" && (
        <Button size="sm" variant="ghost" pending={pending} onClick={() => {
          if (window.confirm("Убрать позицию в архив?")) run("archived");
        }}>
          В архив
        </Button>
      )}
    </div>
  );
}

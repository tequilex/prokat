"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { field } from "@/components/ui/field";
import { adminCreateCity } from "@/server/actions/admin";

const INPUT = `${field} h-10 rounded-md px-3 text-sm`;

export function CityForm() {
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await adminCreateCity({ name, region });
      if (!r.ok) setError(r.error);
      else { setName(""); setRegion(""); }
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Город
        <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Регион
        <input value={region} onChange={(e) => setRegion(e.target.value)} className={INPUT} />
      </label>
      <Button type="submit" size="sm" pending={pending}>Добавить</Button>
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </form>
  );
}

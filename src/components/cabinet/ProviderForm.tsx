"use client";

// Форма проката: онбординг (create) и настройки (edit).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createProvider, updateProvider } from "@/server/actions/owner";

export interface ProviderFormValues {
  name: string;
  cityId: string;
  description: string;
  address: string;
  phones: string;    // строка через запятую
  workHours: string;
}

const INPUT = "h-11 rounded-md border border-border bg-background px-3 text-foreground";

export function ProviderForm({
  mode, cities, initial,
}: {
  mode: "create" | "edit";
  cities: Array<{ id: string; name: string }>;
  initial: ProviderFormValues;
}) {
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const set = (patch: Partial<ProviderFormValues>) => {
    setSaved(false);
    setV((cur) => ({ ...cur, ...patch }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = mode === "create" ? await createProvider(v) : await updateProvider(v);
      if (!r.ok) {
        setError(r.error === "already_has_provider" ? "У вас уже есть прокат." : r.error);
        return;
      }
      if (mode === "create") router.push("/cabinet/listings/new");
      else setSaved(true);
    });
  };

  return (
    <form onSubmit={submit} className="flex max-w-lg flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Название проката
        <input required minLength={3} maxLength={150} value={v.name}
          onChange={(e) => set({ name: e.target.value })} className={INPUT} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Город
        <select required value={v.cityId} disabled={mode === "edit"}
          onChange={(e) => set({ cityId: e.target.value })}
          className={`${INPUT} disabled:opacity-60`}>
          <option value="" disabled>Выберите город</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {mode === "edit" && (
          <span className="text-xs text-muted-foreground">Город после создания не меняется.</span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Адрес
        <input maxLength={300} value={v.address} placeholder="ул. Баумана, 10"
          onChange={(e) => set({ address: e.target.value })} className={INPUT} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Телефоны (через запятую)
        <input required value={v.phones} placeholder="+7 900 000-00-00"
          onChange={(e) => set({ phones: e.target.value })} className={INPUT} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Часы работы
        <input maxLength={200} value={v.workHours} placeholder="пн–пт 10:00–19:00, сб–вс 11:00–17:00"
          onChange={(e) => set({ workHours: e.target.value })} className={INPUT} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Описание
        <textarea maxLength={2000} rows={4} value={v.description}
          onChange={(e) => set({ description: e.target.value })}
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground" />
      </label>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {saved && <p className="text-sm text-muted-foreground" role="status">Сохранено.</p>}

      <Button type="submit" pending={pending} className="w-fit">
        {mode === "create" ? "Создать прокат" : "Сохранить"}
      </Button>
    </form>
  );
}

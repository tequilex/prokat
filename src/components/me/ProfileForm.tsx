"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateProfile } from "@/server/actions/profile";

const INPUT = "h-11 rounded-md border border-border bg-background px-3 text-foreground";

export function ProfileForm({ initialName, initialPhone }: { initialName: string; initialPhone: string }) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const r = await updateProfile({ name, phone });
      if (r.ok) setSaved(true);
      else setError(r.error);
    });
  };

  return (
    <form onSubmit={submit} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Имя
        <input required maxLength={100} value={name}
          onChange={(e) => { setName(e.target.value); setSaved(false); }} className={INPUT} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Телефон
        <input type="tel" value={phone} placeholder="+7 900 000-00-00" autoComplete="tel"
          onChange={(e) => { setPhone(e.target.value); setSaved(false); }} className={INPUT} />
        <span className="text-xs text-muted-foreground">
          Подставляется в форму заявки на бронь.
        </span>
      </label>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {saved && <p className="text-sm text-muted-foreground" role="status">Сохранено.</p>}

      <Button type="submit" pending={pending} className="w-fit">Сохранить</Button>
    </form>
  );
}

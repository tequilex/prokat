"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { field } from "@/components/ui/field";
import { updateProfile } from "@/server/actions/profile";

const INPUT = `${field} h-11 rounded-md px-3`;

export function ProfileForm({
  initialName, initialPhone, initialBio,
}: {
  initialName: string;
  initialPhone: string;
  initialBio: string;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [bio, setBio] = useState(initialBio);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const r = await updateProfile({ name, phone, bio });
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
          Подставляется в форму заявки и показывается покупателю после подтверждения.
        </span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        О себе
        <textarea maxLength={500} rows={3} value={bio}
          onChange={(e) => { setBio(e.target.value); setSaved(false); }}
          placeholder="Пара слов для покупателей — видно в вашем профиле"
          className={`${field} rounded-md px-3 py-2`} />
      </label>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {saved && <p className="text-sm text-muted-foreground" role="status">Сохранено.</p>}

      <Button type="submit" pending={pending} className="w-fit">Сохранить</Button>
    </form>
  );
}

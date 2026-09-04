"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { field } from "@/components/ui/field";
import { suggestLocative } from "@/lib/catalog/city-locative";
import { adminCreateCity, adminUpdateCity } from "@/server/actions/admin";

const INPUT = `${field} h-10 px-3 text-sm`;

export interface EditableCity {
  id: string;
  name: string;
  region: string | null;
  nameLocative: string | null;
}

/* Форма города — и добавление, и правка. Слаг не редактируется: он лежит в
 * адресах всех страниц города и в чужих ссылках.
 *
 * Падеж («в Казани») предлагается правилом, пока его не тронули руками:
 * правило берёт частые формы, а «Нижний Новгород» и «Ростов-на-Дону» — забота
 * человека. Поле необязательное: пустое означает, что заголовки соберутся без
 * предлога, а не что покажется неверный падеж. */
export function CityForm({ city, onDone }: { city?: EditableCity; onDone?: () => void }) {
  const [name, setName] = useState(city?.name ?? "");
  const [region, setRegion] = useState(city?.region ?? "");
  // У заведённого города падежа может не быть — тогда подсказываем его и здесь,
  // иначе поле открывалось бы пустым и «Сохранить» снова записало бы NULL.
  const [nameLocative, setNameLocative] = useState(
    city ? city.nameLocative ?? suggestLocative(city.name) : "",
  );
  // Однажды исправленный падеж правило больше не перетирает.
  const [locativeTouched, setLocativeTouched] = useState(Boolean(city?.nameLocative));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const editName = (value: string) => {
    setName(value);
    if (!locativeTouched) setNameLocative(suggestLocative(value));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = { name, region, nameLocative };
      const r = city
        ? await adminUpdateCity(city.id, payload)
        : await adminCreateCity(payload);
      if (!r.ok) { setError(r.error); return; }
      if (city) onDone?.();
      else { setName(""); setRegion(""); setNameLocative(""); setLocativeTouched(false); }
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Город
        <input required minLength={2} value={name} onChange={(e) => editName(e.target.value)} className={INPUT} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        В городе (падеж)
        <input
          value={nameLocative}
          placeholder="Казани"
          onChange={(e) => { setNameLocative(e.target.value); setLocativeTouched(true); }}
          className={INPUT}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Регион
        <input value={region} onChange={(e) => setRegion(e.target.value)} className={INPUT} />
      </label>
      <Button type="submit" size="sm" pending={pending}>{city ? "Сохранить" : "Добавить"}</Button>
      {city && onDone && (
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>Отмена</Button>
      )}
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </form>
  );
}

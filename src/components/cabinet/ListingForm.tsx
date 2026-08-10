"use client";

// Форма позиции (create/edit). Фото грузятся сразу через /api/upload
// (sharp → webp → S3) и попадают в photos_json при сохранении формы.

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormBlock } from "@/components/cabinet/FormBlock";
import { createListing, updateListing } from "@/server/actions/owner";

interface Photo { url: string; width: number; height: number }

export interface ListingFormValues {
  title: string;
  cityId: string;
  categoryId: string;
  location: string;
  description: string;
  priceDay: string;
  priceHour: string;
  priceWeek: string;
  depositType: "money" | "document" | "none";
  depositAmount: string;
  quantity: string;
  photos: Photo[];
}

const INPUT = "h-11 rounded-md border border-border bg-background px-3 text-foreground";
const MAX_PHOTOS = 10;

export function ListingForm({
  mode, listingId, cities, categories, initial,
}: {
  mode: "create" | "edit";
  listingId?: string;
  cities: Array<{ id: string; name: string }>;
  // Подкатегории (или корневые без детей) — позиция вешается на лист дерева.
  categories: Array<{ id: string; name: string }>;
  initial: ListingFormValues;
}) {
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const set = (patch: Partial<ListingFormValues>) => setV((cur) => ({ ...cur, ...patch }));

  const uploadFiles = async (files: FileList) => {
    setUploadError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, MAX_PHOTOS - v.photos.length)) {
        const fd = new FormData();
        fd.append("image", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.file?.url) {
          setUploadError(res.status === 503
            ? "Хранилище изображений не настроено (STORAGE_* в .env) — позицию можно сохранить без фото."
            : "Не удалось загрузить фото.");
          break;
        }
        setV((cur) => ({
          ...cur,
          photos: [...cur.photos, { url: body.file.url, width: body.file.width, height: body.file.height }],
        }));
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const input = { ...v, description: v.description };
      const r = mode === "create"
        ? await createListing(input)
        : await updateListing(listingId!, input);
      if (!r.ok) { setError(r.error); return; }
      router.push("/cabinet/listings");
    });
  };

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-3">
      <FormBlock title="Что сдаёте" hint="название видят в поиске">
        <label className="flex flex-col gap-1 text-sm">
          Название
          <input required minLength={3} maxLength={200} value={v.title}
            placeholder="Перфоратор Bosch GBH 2-26"
            onChange={(e) => set({ title: e.target.value })} className={INPUT} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Категория
          <select required value={v.categoryId}
            onChange={(e) => set({ categoryId: e.target.value })} className={INPUT}>
            <option value="" disabled>Выберите категорию</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Описание
          <textarea maxLength={3000} rows={4} value={v.description}
            onChange={(e) => set({ description: e.target.value })}
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground" />
        </label>
      </FormBlock>

      <FormBlock title="Фото" hint={`первое станет обложкой · до ${MAX_PHOTOS} штук`}>
        {v.photos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {v.photos.map((p, i) => (
              <div key={p.url} className="relative h-20 w-20 overflow-hidden rounded-md bg-muted">
                <Image src={p.url} alt={`Фото ${i + 1}`} fill sizes="80px" className="object-cover" />
                <button
                  type="button" aria-label="Удалить фото"
                  onClick={() => set({ photos: v.photos.filter((x) => x.url !== p.url) })}
                  className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5 hover:bg-background"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {v.photos.length < MAX_PHOTOS && (
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
            {uploading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {uploading ? "Загрузка..." : "Добавить фото"}
            <input
              ref={fileRef} type="file" accept="image/*" multiple className="hidden"
              disabled={uploading}
              onChange={(e) => e.target.files?.length && uploadFiles(e.target.files)}
            />
          </label>
        )}
        {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
      </FormBlock>

      <FormBlock title="Цена и залог" hint="залог возвращается арендатору">
        <fieldset className="flex flex-col gap-1 text-sm">
          <legend className="mb-1">Цены, ₽ (заполните хотя бы одну)</legend>
          <div className="flex flex-wrap gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
              За сутки
              <input type="number" min={0} value={v.priceDay}
                onChange={(e) => set({ priceDay: e.target.value })} className={INPUT} />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
              За час
              <input type="number" min={0} value={v.priceHour}
                onChange={(e) => set({ priceHour: e.target.value })} className={INPUT} />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
              За неделю
              <input type="number" min={0} value={v.priceWeek}
                onChange={(e) => set({ priceWeek: e.target.value })} className={INPUT} />
            </label>
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-2">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Залог
            <select value={v.depositType}
              onChange={(e) => set({ depositType: e.target.value as ListingFormValues["depositType"] })}
              className={INPUT}>
              <option value="money">Деньги</option>
              <option value="document">Документ</option>
              <option value="none">Без залога</option>
            </select>
          </label>
          {v.depositType === "money" && (
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Сумма залога, ₽
              <input type="number" min={0} value={v.depositAmount}
                onChange={(e) => set({ depositAmount: e.target.value })} className={INPUT} />
            </label>
          )}
        </div>
      </FormBlock>

      <FormBlock title="Где забирают" hint="точный адрес не публикуем">
        <div className="flex flex-wrap gap-2">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Город
            <select required value={v.cityId}
              onChange={(e) => set({ cityId: e.target.value })} className={INPUT}>
              <option value="" disabled>Выберите город</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="flex w-28 flex-col gap-1 text-sm">
            Количество
            <input type="number" required min={1} max={1000} value={v.quantity}
              onChange={(e) => set({ quantity: e.target.value })} className={INPUT} />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Район или ориентир выдачи (необязательно)
          <input maxLength={120} value={v.location}
            placeholder="м. Кремлёвская"
            onChange={(e) => set({ location: e.target.value })} className={INPUT} />
        </label>
      </FormBlock>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      <Button type="submit" pending={pending} className="w-fit">
        {mode === "create" ? "Добавить позицию" : "Сохранить"}
      </Button>
    </form>
  );
}

"use client";

// Форма позиции (create/edit). Фото грузятся сразу через /api/upload
// (sharp → webp → S3) и попадают в photos_json при сохранении формы.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormBlock } from "@/components/cabinet/FormBlock";
import { StepProgress } from "@/components/cabinet/StepProgress";
import { PhotoDrop, type Photo } from "@/components/cabinet/PhotoDrop";
import { field } from "@/components/ui/field";
import { createListing, updateListing } from "@/server/actions/owner";

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
  handoverPickup: boolean;
  handoverDelivery: boolean;
  photos: Photo[];
}

const INPUT = `${field} h-11 px-3`;
const MAX_PHOTOS = 10;

// Способ получения — галочка видом чипа, как в фильтрах каталога. Чип оттуда не
// переиспользуется: там это radio с defaultChecked, а здесь способов можно
// выбрать два, и значение живёт в состоянии формы.
//
// Ввод sr-only, поэтому кольцо фокуса рисуется вручную: без него обязательное
// поле не видно с клавиатуры. Наружное и с отступом — то же, что у чипов
// фильтров и по той же причине: цвет кольца совпадает с кантом отмеченного
// чипа, и вплотную его было бы не различить.
function HandoverChip({
  label, icon, checked, onChange,
}: {
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-border
        bg-background px-4 text-sm text-muted-foreground transition-colors hover:text-foreground
        has-[:checked]:border-accent has-[:checked]:bg-selected has-[:checked]:text-selected-foreground
        has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring
        has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background`}
    >
      <input
        type="checkbox" checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      {icon}
      {label}
    </label>
  );
}

export function ListingForm({
  mode, listingId, cities, categories, initial, sellerName: initialSellerName = "",
}: {
  mode: "create" | "edit";
  listingId?: string;
  cities: Array<{ id: string; name: string }>;
  // Подкатегории (или корневые без детей) — позиция вешается на лист дерева.
  categories: Array<{ id: string; name: string }>;
  initial: ListingFormValues;
  // Текущее имя владельца: показываем при первой публикации, чтобы он увидел,
  // как его назовут покупатели, и мог заменить прямо здесь.
  sellerName?: string;
}) {
  const [v, setV] = useState(initial);
  const [sellerName, setSellerName] = useState(initialSellerName);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const set = (patch: Partial<ListingFormValues>) => setV((cur) => ({ ...cur, ...patch }));

  // Сколько блоков уже собрано — по тому же смыслу, что и их заголовки.
  // Не валидация: сервер всё равно проверит, здесь только счётчик объёма.
  const blocksDone = useMemo(
    () =>
      [
        v.title.trim().length >= 3 && v.categoryId !== "",
        v.photos.length > 0,
        [v.priceDay, v.priceHour, v.priceWeek].some((p) => Number(p) > 0),
        v.cityId !== "" && Number(v.quantity) > 0
          && (v.handoverPickup || v.handoverDelivery),
      ].filter(Boolean).length,
    [v],
  );

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
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      // sellerName едет лишним ключом: listingFormSchema его отбросит, а
      // экшен достанет из сырого ввода и обновит users.name.
      const input = mode === "create" ? { ...v, sellerName } : { ...v };
      const r = mode === "create"
        ? await createListing(input)
        : await updateListing(listingId!, input);
      if (!r.ok) { setError(r.error); return; }
      router.push("/cabinet/listings");
    });
  };

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-3">
      <StepProgress
        title={mode === "create" ? "Сдаём вещь" : "Правим объявление"}
        done={blocksDone}
        total={4}
      />

      {mode === "create" && (
        <FormBlock title="Как вас увидят покупатели" hint="имя рядом с объявлением">
          <label className="flex flex-col gap-1 text-sm">
            Имя
            <input maxLength={100} value={sellerName}
              placeholder="Например, ПрокатМастер"
              onChange={(e) => setSellerName(e.target.value)} className={INPUT} />
          </label>
        </FormBlock>
      )}

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
            className={`${field} px-3 py-2`} />
        </label>
      </FormBlock>

      <FormBlock title="Фото" hint={`первое станет обложкой · до ${MAX_PHOTOS} штук`}>
        <PhotoDrop
          photos={v.photos}
          max={MAX_PHOTOS}
          uploading={uploading}
          error={uploadError}
          onFiles={uploadFiles}
          onRemove={(url) => set({ photos: v.photos.filter((x) => x.url !== url) })}
        />
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
        <fieldset className="flex flex-col gap-1 text-sm">
          <legend className="mb-1">Способ получения (хотя бы один)</legend>
          <div className="flex flex-wrap gap-2">
            <HandoverChip
              label="Самовывоз"
              icon={<Package className="h-4 w-4 shrink-0" aria-hidden="true" />}
              checked={v.handoverPickup}
              onChange={(checked) => set({ handoverPickup: checked })}
            />
            <HandoverChip
              label="Доставка"
              icon={<Truck className="h-4 w-4 shrink-0" aria-hidden="true" />}
              checked={v.handoverDelivery}
              onChange={(checked) => set({ handoverDelivery: checked })}
            />
          </div>
        </fieldset>

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

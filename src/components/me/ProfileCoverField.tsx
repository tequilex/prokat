"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CoverUploadButton } from "@/components/account/CoverUploadButton";
import { updateCover } from "@/server/actions/profile";

/* Обложка на экране настроек: превью в честной пропорции 4:1, поверх — та же
 * кнопка загрузки, что и в шапке кабинета. Единственное место, где обложку
 * можно снять совсем. */
export function ProfileCoverField({ coverUrl }: { coverUrl: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [removing, startRemoving] = useTransition();

  const remove = () => {
    setError(null);
    startRemoving(async () => {
      const res = await updateCover(null);
      if (!res.ok) {
        setError("Не удалось убрать обложку.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-[4/1] w-full overflow-hidden rounded-md bg-muted">
        {coverUrl && (
          <Image src={coverUrl} alt="Обложка профиля" fill sizes="640px" className="object-cover" />
        )}
        <CoverUploadButton hasCover={coverUrl !== null} className="absolute bottom-2.5 right-2.5" />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-xs text-muted-foreground">
          Видна всем на вашей публичной странице. Лучше всего смотрится широкое фото, примерно 4:1.
        </p>
        {coverUrl && (
          <button
            type="button"
            disabled={removing}
            onClick={remove}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-60"
          >
            {removing ? "Убираем…" : "Убрать обложку"}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { Brackets } from "@/components/brand/Brackets";
import { updateCover } from "@/server/actions/profile";
import { cn } from "@/lib/utils";

/* «Сменить обложку»: тот же путь, что у фото объявления — файл уезжает в
 * /api/upload (sharp → webp → S3), и уже готовый адрес сохраняется действием.
 * Кроппера нет: object-cover режет фотографию по месту, а подсказка про 4:1
 * висит рядом на экране настроек. */
export function CoverUploadButton({
  hasCover,
  className,
}: {
  hasCover: boolean;
  className?: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, startSaving] = useTransition();

  const busy = uploading || saving;

  const pick = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.file?.url) {
        setError(res.status === 503
          ? "Хранилище изображений не настроено (STORAGE_* в .env)."
          : "Не удалось загрузить обложку.");
        return;
      }
      const url: string = body.file.url;
      startSaving(async () => {
        const saved = await updateCover(url);
        if (!saved.ok) {
          setError("Не удалось сохранить обложку.");
          return;
        }
        router.refresh();
      });
    } finally {
      setUploading(false);
      // Один и тот же файл должен выбираться повторно (после ошибки).
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className={cn("flex flex-col items-end gap-1.5", className)}>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => void pick(e.target.files)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="glass-photo inline-flex h-9 items-center gap-2 rounded-pill px-4 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-70"
      >
        {busy
          ? <Brackets size={12} running className="text-current" />
          : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
        {busy ? "Загружаем…" : hasCover ? "Сменить обложку" : "Добавить обложку"}
      </button>
      {error && (
        <p className="glass-photo max-w-[280px] rounded-md px-3 py-1.5 text-xs">{error}</p>
      )}
    </div>
  );
}

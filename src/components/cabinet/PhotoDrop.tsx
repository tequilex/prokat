"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Brackets } from "@/components/brand/Brackets";
import { cn } from "@/lib/utils";

export interface Photo {
  url: string;
  width: number;
  height: number;
}

/* Зона загрузки фото: те же скобки, только пустые — «положите вещь в скобки».
 * Первое фото становится обложкой. Спиннера нет: загрузку показывают дышащие
 * скобки, как и во всех остальных ожиданиях. */
export function PhotoDrop({
  photos,
  max,
  uploading,
  error,
  onFiles,
  onRemove,
}: {
  photos: Photo[];
  max: number;
  uploading: boolean;
  error: string | null;
  onFiles: (files: FileList) => void;
  onRemove: (url: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const full = photos.length >= max;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2.5">
        {photos.map((p, i) => (
          <div
            key={p.url}
            className={cn(
              "relative h-[100px] overflow-hidden rounded-lg border border-border bg-muted",
              i === 0 ? "w-[132px]" : "w-[100px]",
            )}
          >
            <Image src={p.url} alt={`Фото ${i + 1}`} fill sizes="132px" className="object-cover" />
            {i === 0 && (
              <span className="absolute left-2 top-2 rounded-sm bg-accent px-2 py-0.5 font-mono text-micro font-medium uppercase tracking-mono text-accent-foreground">
                Обложка
              </span>
            )}
            <button
              type="button"
              aria-label={`Удалить фото ${i + 1}`}
              onClick={() => onRemove(p.url)}
              className="absolute right-1 top-1 rounded-full bg-background/80 p-1 hover:bg-background"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {!full && (
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
            }}
            className={cn(
              "flex h-[100px] min-w-[180px] flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed border-accent px-3 text-center transition-colors",
              dragging ? "bg-accent/15" : "bg-accent/5",
            )}
          >
            <Brackets size={26} running={uploading} />
            <span className="text-sm text-muted-foreground">
              {uploading ? "Загружаем фото…" : "Положите вещь в скобки — перетащите фото"}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                if (e.target.files?.length) onFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

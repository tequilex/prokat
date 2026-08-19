import Image from "next/image";
import { cn } from "@/lib/utils";

/* Обложка профиля: широкая фотография, поверх которой ложится шапка сайта, а
 * снизу на неё наезжает аватар. Затемнение (.cover-scrim) решает две задачи
 * сразу — держит читаемым хром на любой фотографии и уводит нижний край в цвет
 * фона, чтобы кольцо вокруг аватара совпадало с холстом в обеих темах.
 *
 * Фотографии может не быть: тогда вместо неё ровная плашка, раскладка та же. */
export function ProfileCover({
  src,
  className,
  priority = false,
  children,
}: {
  src: string | null;
  /** Высота задаётся потребителем: у кабинета и витрины она разная. */
  className?: string;
  priority?: boolean;
  /** Действия поверх обложки — кнопка смены, крошки, «назад». */
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("relative w-full overflow-hidden bg-muted", className)}>
      {src && (
        <>
          <Image
            src={src}
            alt=""
            fill
            sizes="100vw"
            priority={priority}
            className="object-cover"
          />
          {/* Затемнение — только на фотографии: пустую плашку оно превращало
            * бы в неотличимый от фона градиент. */}
          <span aria-hidden="true" className="cover-scrim absolute inset-0" />
        </>
      )}
      {children}
    </div>
  );
}

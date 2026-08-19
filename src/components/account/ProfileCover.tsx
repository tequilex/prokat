import Image from "next/image";
import { cn } from "@/lib/utils";
import { resolveCoverUrl } from "@/lib/covers";

/* Обложка профиля: широкая картинка, поверх которой ложится шапка сайта, а
 * снизу на неё наезжает аватар. Затемнение (.cover-scrim) решает две задачи
 * сразу — держит читаемым хром на любой картинке и уводит нижний край в цвет
 * фона, чтобы кольцо вокруг аватара совпадало с холстом в обеих темах.
 *
 * src = null означает «ничего не выбирал» — показывается дефолтный пресет.
 * Пресеты — статичные SVG из public/covers: их рендерим обычным <img>
 * (оптимизатору next/image SVG не нужен и без dangerouslyAllowSVG он их
 * не пропускает); загруженные фотографии — через next/image. */
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
  const url = resolveCoverUrl(src);
  return (
    <div className={cn("relative w-full overflow-hidden bg-muted", className)}>
      {url.endsWith(".svg") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <Image
          src={url}
          alt=""
          fill
          sizes="100vw"
          priority={priority}
          className="object-cover"
        />
      )}
      <span aria-hidden="true" className="cover-scrim absolute inset-0" />
      {children}
    </div>
  );
}

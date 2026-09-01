import Image from "next/image";

interface AvatarProps {
  src: string | null;
  name?: string | null;
  size: number;
  className?: string;
}

// djb2 — стабильный hash без коллизий на коротких ASCII-никах. Тот же seed
// возвращает тот же hue на любой странице, в любой сессии, в любом рендере.
function hueFromString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 360;
}

function pickLetter(name?: string | null): string {
  const src = (name ?? "").trim();
  if (!src) return "?";
  return src.charAt(0).toUpperCase();
}

// Единая аватарка для всех мест UI: header, comments, post-card, profile.
// Есть src → next/image; нет → круг с первой буквой, фон hsl от хеша имени.
// Текст белый, насыщенность/светлота
// фиксированы так, чтобы контраст работал в обеих темах.
export function Avatar({ src, name, size, className = "" }: AvatarProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        // Размер задаётся ещё и стилем, а не только атрибутами. Атрибуты дают
        // пропорцию, но не мешают флекс-родителю растянуть картинку по высоте:
        // align-items по умолчанию stretch, а shrink-0 держит только ширину.
        // В списке переписок строка стала в три этажа — и круглая аватарка
        // превратилась в овал.
        //
        // object-cover рядом: аватарка не обязана быть квадратной, а без него
        // неквадратную расплющивало бы в этот же бокс.
        style={{ width: size, height: size }}
        className={`rounded-full shrink-0 object-cover ${className}`}
      />
    );
  }
  const seed = (name ?? "?").toLowerCase();
  const hue = hueFromString(seed);
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        backgroundColor: `hsl(${hue}, 60%, 45%)`,
        fontSize: Math.round(size * 0.45),
      }}
      className={`rounded-full shrink-0 inline-flex items-center justify-center text-white font-medium leading-none select-none ${className}`}
    >
      {pickLetter(name)}
    </div>
  );
}

// Стандартные обложки профиля. Файлы лежат в public/covers/ и адресуются
// обычным путём — в users.cover_url пресет хранится этим же путём, поэтому
// isCoverPreset() — это и белый список для server action: всё, что не пресет,
// должно быть загрузкой самого пользователя.
//
// NULL в cover_url означает «дефолтный пресет» (первый в списке): так смена
// дефолта в будущем подхватится у всех, кто ничего не выбирал.

export interface CoverPreset {
  slug: string;
  /** Подпись в выборе обложки. */
  label: string;
  url: string;
}

export const COVER_PRESETS: CoverPreset[] = [
  { slug: "mix", label: "Всё вместе", url: "/covers/mix.svg" },
  { slug: "tools", label: "Инструменты", url: "/covers/tools.svg" },
  { slug: "clothes", label: "Одежда", url: "/covers/clothes.svg" },
];

export const DEFAULT_COVER = COVER_PRESETS[0]!;

export function isCoverPreset(url: string): boolean {
  return COVER_PRESETS.some((p) => p.url === url);
}

/** Что показывать: выбранное или дефолтный пресет. */
export function resolveCoverUrl(coverUrl: string | null): string {
  return coverUrl ?? DEFAULT_COVER.url;
}

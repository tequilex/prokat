// Стандартные обложки профиля. Файлы лежат в public/covers/ и адресуются
// обычным путём — в users.cover_url пресет хранится этим же путём, поэтому
// isCoverPreset() — это и белый список для server action: всё, что не пресет,
// должно быть загрузкой самого пользователя.
//
// NULL в cover_url означает «дефолтный пресет» (первый в списке): так смена
// дефолта в будущем подхватится у всех, кто ничего не выбирал.

export interface CoverPreset {
  slug: string;
  /** В выборе подписи не показываются — это aria-label плитки. */
  label: string;
  url: string;
}

// Картинки отобраны владельцем: три — из серий Claude Design (исходники — в
// /covers в корне репо, вне гита), остальные — из ранних макетных вариантов.
export const COVER_PRESETS: CoverPreset[] = [
  { slug: "lenta", label: "Лента с вещами", url: "/covers/lenta.svg" },
  { slug: "steklo", label: "Стеклянные плитки", url: "/covers/steklo.svg" },
  { slug: "chertezh", label: "Чертёж", url: "/covers/chertezh.svg" },
  { slug: "camp", label: "Вечер в лагере", url: "/covers/camp.svg" },
  { slug: "doodles", label: "Дудлы вещей", url: "/covers/doodles.svg" },
  { slug: "houses", label: "Соседский квартал", url: "/covers/houses.svg" },
  { slug: "stripes", label: "Плакатные полосы", url: "/covers/stripes.svg" },
  { slug: "ribbons", label: "Ленты-волны", url: "/covers/ribbons.svg" },
];

export const DEFAULT_COVER = COVER_PRESETS[0]!;

export function isCoverPreset(url: string): boolean {
  return COVER_PRESETS.some((p) => p.url === url);
}

/** Своя загрузка, а не пресет: пресеты живут под /covers/, загрузки — в S3. */
export function isOwnCoverUrl(url: string | null): url is string {
  return url !== null && !url.startsWith("/covers/");
}

/* Что показывать: выбранное или дефолтный пресет. Адрес под /covers/, которого
 * больше нет в списке, — осиротевший пресет (список менялся после того, как
 * человек выбрал): тихо падаем на дефолт, а не показываем битую картинку. */
export function resolveCoverUrl(coverUrl: string | null): string {
  if (coverUrl === null) return DEFAULT_COVER.url;
  if (coverUrl.startsWith("/covers/") && !isCoverPreset(coverUrl)) return DEFAULT_COVER.url;
  return coverUrl;
}

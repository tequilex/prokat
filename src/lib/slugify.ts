// Slug-генератор (RU → latin транслитерация по предопределённой map,
// потом NFKD-стрип диакритики, lowercase, [^a-z0-9] → '-', collapse, trim, max 80).
// Проверка уникальности — на стороне вызывающего, против своей таблицы
// (cities/categories/providers/listings имеют разные пространства слагов).

const CYR: Record<string, string> = {
  а:"a", б:"b", в:"v", г:"g", д:"d", е:"e", ё:"yo",
  ж:"zh", з:"z", и:"i", й:"y", к:"k", л:"l", м:"m",
  н:"n", о:"o", п:"p", р:"r", с:"s", т:"t", у:"u",
  ф:"f", х:"kh", ц:"ts", ч:"ch", ш:"sh", щ:"sch",
  ъ:"", ы:"y", ь:"", э:"e", ю:"yu", я:"ya",
};

export function slugify(input: string): string {
  if (!input) return "";
  const lower = input.toLowerCase();
  const translit = Array.from(lower).map(ch => CYR[ch] ?? ch).join("");
  const stripped = translit.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const dashed = stripped.replace(/[^a-z0-9]+/g, "-");
  const trimmed = dashed.replace(/^-+|-+$/g, "");
  const truncated = trimmed.slice(0, 80);
  return truncated.replace(/-+$/g, ""); // re-trim if slice ended on dash
}

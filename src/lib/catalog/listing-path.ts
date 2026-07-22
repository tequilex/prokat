// URL карточки товара: /{city}/{categorySlug}/{listingSlug}-{listingId}.
// id — ULID (26 символов Crockford base32); отделяем его от хвоста slug.

const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

export function extractListingId(lastSegment: string): { slug: string; id: string } | null {
  const idx = lastSegment.lastIndexOf("-");
  if (idx <= 0) return null;
  const id = lastSegment.slice(idx + 1);
  const slug = lastSegment.slice(0, idx);
  if (!ULID_RE.test(id)) return null;
  return { slug, id };
}

export function listingPath(
  citySlug: string, categorySlug: string, listingSlug: string, listingId: string,
): string {
  return `/${citySlug}/${categorySlug}/${listingSlug}-${listingId}`;
}

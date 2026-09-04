// Единственное правило о том, видно ли объявление в публичном контуре: в
// каталоге, поиске, sitemap, на карточке товара и для создания заявки на бронь.
//
// Модуль намеренно не ходит в БД и принимает уже прочитанные поля — как
// lib/chat/rules.ts. Права должны быть покрыты тестами полностью, а тесты
// проекта живого Postgres не требуют (docs/testing.md).
//
// Бан владельца гасит его объявления на записи (adminBanUser переводит active в
// hidden), поэтому выборки каталога отсеивают их обычным фильтром по статусу.
// Эта функция — вторая линия: статус может разойтись с баном, если админ поднял
// объявление вручную через adminSetListingStatus.

export type ListingVisibility = {
  status: "active" | "hidden" | "archived";
  ownerBannedAt: Date | null;
};

export function isPubliclyVisible(listing: ListingVisibility): boolean {
  return listing.status === "active" && listing.ownerBannedAt === null;
}

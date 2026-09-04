// Правила доступа к переписке. Единственный источник правды о том, кто кому
// может писать и кто что видит.
//
// Модуль намеренно не ходит в БД и принимает уже прочитанные строки: тесты
// проекта живого Postgres не требуют (docs/testing.md), а права — ровно то,
// что должно быть покрыто тестами полностью.
//
// Общее правило: читать можно всегда, писать — нет. История переписки остаётся
// доступной обоим участникам, даже когда объявление скрыли или собеседника
// забанили; в этих случаях закрывается только отправка.

export type ChatListingStatus = "active" | "hidden" | "archived";

export type ChatViewer = {
  id: string;
  bannedAt: Date | null;
};

export type ChatListing = {
  ownerUserId: string;
  status: ChatListingStatus;
};

export type ChatParticipants = {
  ownerUserId: string;
  customerUserId: string;
};

export type ChatDenial =
  | "banned"
  | "own_listing"
  | "listing_not_active"
  | "not_participant"
  | "counterpart_banned";

export type ChatVerdict = { ok: true } | { ok: false; reason: ChatDenial };

const OK: ChatVerdict = { ok: true };
const deny = (reason: ChatDenial): ChatVerdict => ({ ok: false, reason });

// Завести новый тред можно только к живому чужому объявлению живого владельца.
// Бан владельца — отдельная проверка, и стоит она раньше статуса нарочно: с
// баном объявление уходит в hidden, но отказ должен называть аккаунт, а не
// объявление, иначе арендатор увидит «снято с публикации» там, где дело в
// собеседнике.
export function canStartThread(
  viewer: ChatViewer,
  listing: ChatListing,
  ownerBannedAt: Date | null,
): ChatVerdict {
  if (viewer.bannedAt) return deny("banned");
  if (listing.ownerUserId === viewer.id) return deny("own_listing");
  if (ownerBannedAt) return deny("counterpart_banned");
  if (listing.status !== "active") return deny("listing_not_active");
  return OK;
}

// Порядок проверок значим: постороннему отвечаем «не участник», не раскрывая
// состояние чужого объявления и чужого аккаунта.
export function canPostMessage(
  viewer: ChatViewer,
  participants: ChatParticipants,
  listing: ChatListing,
  counterpartBannedAt: Date | null,
): ChatVerdict {
  if (viewer.bannedAt) return deny("banned");
  if (!canReadThread(viewer.id, participants)) return deny("not_participant");
  if (counterpartBannedAt) return deny("counterpart_banned");
  if (listing.status !== "active") return deny("listing_not_active");
  return OK;
}

export function canReadThread(viewerId: string, participants: ChatParticipants): boolean {
  return viewerId === participants.ownerUserId || viewerId === participants.customerUserId;
}

// Собеседник: чей профиль показывать в шапке треда и кого уведомлять.
export function counterpartOf(participants: ChatParticipants, viewerId: string): string | null {
  if (viewerId === participants.ownerUserId) return participants.customerUserId;
  if (viewerId === participants.customerUserId) return participants.ownerUserId;
  return null;
}

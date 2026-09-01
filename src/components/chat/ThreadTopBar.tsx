// Шапка переписки: собеседник, его роль в этой сделке и чип объявления.
//
// Имя ThreadTopBar, а не ThreadHeader: последнее занято типом в server/chat,
// и импортировать их вместе пришлось бы через переименование.

import Link from "next/link";
import Image from "next/image";
import { Avatar } from "@/components/ui/Avatar";
import { ThreadBackButton } from "@/components/chat/ThreadBackButton";
import { listingPath } from "@/lib/catalog/listing-path";
import { formatDeposit, formatPrice } from "@/lib/catalog/format";
import { content } from "@theme/content";
import type { ThreadHeader } from "@/server/chat";

const t = content.chat;

export function ThreadTopBar({ header, viewerId }: { header: ThreadHeader; viewerId: string }) {
  const name = header.counterpartName ?? "Собеседник";
  // Роль объясняет, почему вы вообще говорите: моя вещь или чужая.
  const role = header.ownerUserId === viewerId ? t.roleTheyRent : t.roleIRent;
  const href = listingPath(
    header.listingCitySlug,
    header.listingCategorySlug,
    header.listingSlug,
    header.listingId,
  );

  // Цена и залог собираются общими форматтерами: второй реализации денежного
  // формата в проекте быть не должно. Залог бывает трёх видов, не только суммой.
  const price = header.listingPriceDay ? `${formatPrice(header.listingPriceDay)}/сутки` : null;
  const deposit = formatDeposit(header.listingDepositType, header.listingDepositAmount);

  const chipInner = (
    <>
      {header.listingImage && (
        <Image
          src={header.listingImage}
          alt=""
          width={28}
          height={28}
          className="h-7 w-7 shrink-0 rounded-sm object-cover"
        />
      )}
      <span className="min-w-0">
        <span className="block max-w-[190px] truncate text-xs font-medium">
          {header.listingTitle}
        </span>
        <span className="block font-mark text-2xs text-muted-foreground">
          {[price, deposit].filter(Boolean).join(" · ")}
        </span>
      </span>
    </>
  );

  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-2.5 md:px-4">
      {/* Кнопка назад только на мобиле: там заголовок раздела скрыт, и другого
        * пути к списку нет. На десктопе список виден слева. */}
      <ThreadBackButton />

      <Avatar src={header.counterpartImage} name={name} size={40} />

      <div className="min-w-0 flex-1">
        <h2 className="truncate font-display text-base font-bold leading-tight md:text-lg">
          {name}
        </h2>
        <p className="truncate text-xs text-muted-foreground">{role}</p>
      </div>

      {/* Снятое с публикации объявление отдаёт 404 — чип остаётся, ссылка нет. */}
      {header.listingStatus === "active" ? (
        <Link
          href={href as never}
          className="hidden items-center gap-2.5 rounded-sm bg-muted py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-muted/70 sm:flex"
        >
          {chipInner}
        </Link>
      ) : (
        <span className="hidden items-center gap-2.5 rounded-sm bg-muted py-1.5 pl-1.5 pr-2.5 sm:flex">
          {chipInner}
        </span>
      )}
    </header>
  );
}

// Узкий экран: чип не влезает в шапку, поэтому объявление едет отдельной полосой.
export function ThreadListingBar({ header }: { header: ThreadHeader }) {
  const href = listingPath(
    header.listingCitySlug,
    header.listingCategorySlug,
    header.listingSlug,
    header.listingId,
  );

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted px-3 py-2 sm:hidden">
      {header.listingImage && (
        <Image
          src={header.listingImage}
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-sm object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{header.listingTitle}</p>
        <p className="font-mark text-2xs text-muted-foreground">
          {[
            header.listingPriceDay ? `${formatPrice(header.listingPriceDay)}/сутки` : null,
            formatDeposit(header.listingDepositType, header.listingDepositAmount),
          ].filter(Boolean).join(" · ")}
        </p>
      </div>
      {header.listingStatus === "active" && (
        <Link href={href as never} className="shrink-0 text-xs text-accent">
          {t.openListing}
        </Link>
      )}
    </div>
  );
}

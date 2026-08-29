import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, ImageOff } from "lucide-react";
import { listingPhotos, type Listing, type ListingWithOwner } from "@/server/catalog";
import { formatPrice } from "@/lib/catalog/format";
import { listingPath } from "@/lib/catalog/listing-path";
import { freeQty, type AvailabilityMap } from "@/lib/catalog/availability";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/button";

function priceParts(l: Listing): { amount: string; unit: string } | null {
  if (l.priceDay !== null) return { amount: formatPrice(l.priceDay), unit: "в сутки" };
  if (l.priceHour !== null) return { amount: formatPrice(l.priceHour), unit: "в час" };
  if (l.priceWeek !== null) return { amount: formatPrice(l.priceWeek), unit: "в неделю" };
  return null;
}

// Значение для строки «Залог», а не готовая фраза: слева уже стоит подпись.
function depositValue(l: Listing): string {
  if (l.depositType === "none") return "нет";
  if (l.depositType === "document") return "документ";
  return l.depositAmount ? formatPrice(l.depositAmount) : "есть";
}

// Подписи держим короткими: в две колонки на мобайле карточке достаётся около
// 140px под содержимое, и длинная подпись со значением в одну строку не встают.
function SpecRow({
  label, value, tone, inline, className = "",
}: {
  label: string;
  value: string;
  tone?: string;
  /** Списком характеристики идут строкой подряд, а не колонкой с выключкой. */
  inline?: boolean;
  className?: string;
}) {
  return (
    <div className={`${inline
      ? "flex items-baseline gap-1.5"
      : "flex items-baseline justify-between gap-2 sm:gap-3"} ${className}`}>
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className={`min-w-0 truncate ${inline ? "" : "text-right"} ${tone ?? "text-foreground"}`}>
        {value}
      </dd>
    </div>
  );
}

// Единая карточка товара для всего проекта (главная, каталог, поиск, профиль).
// Фото с плашками занятости и продавца, цена, характеристики, кнопка.
//
// availabilityMap и from обязательны: занятость — половина смысла карточки,
// и необязательный проп молча вырождал бы её на страницах, где загрузку
// забыли добавить. Страница грузит занятость одним запросом на всю выдачу.
export function ListingCard({
  item,
  citySlug,
  availabilityMap,
  from,
  view = "grid",
}: {
  item: ListingWithOwner;
  citySlug: string;
  availabilityMap: AvailabilityMap;
  from: string;
  /** Списком фото уезжает влево, остальное — в колонку рядом. */
  view?: "grid" | "list";
}) {
  const list = view === "list";
  const { listing, ownerName, ownerImage, ownerIsVerified, categorySlug, cityName } = item;
  const photo = listingPhotos(listing)[0];
  const href = listingPath(citySlug, categorySlug, listing.slug, listing.id);
  const price = priceParts(listing);
  // Карточке нужен только сегодняшний день: дату «свободно с» она больше не
  // показывает, а календарь на самой позиции скажет точнее.
  const free = freeQty(listing.quantity, availabilityMap.get(from));

  // Зелёный — свободно всё, охра — часть занята, серый — сегодня мест нет.
  // Красный не берём: занятость это состояние предмета, а не отмена и спор.
  const busy = free <= 0;
  const partial = free > 0 && free < listing.quantity;
  const tone = busy ? "text-muted-foreground" : partial ? "text-accent" : "text-primary";
  const dot = busy ? "bg-muted-foreground" : partial ? "bg-accent" : "bg-primary";

  return (
    // Скошенные углы — подпись выдачи, поэтому они перебивают радиус .surface:
    // четыре длинные записи (border-top-left-radius и соседи) ложатся поверх
    // короткой border-radius из компонентного слоя. overflow-hidden обрезает по
    // ним фотографию — она верх карточки и повторяет её форму.
    <article
      className={`surface overflow-hidden rounded-tl-[26px] rounded-tr-[8px] rounded-bl-[8px] rounded-br-[26px] ${
        list ? "flex flex-row" : "flex flex-col"
      }`}
    >
      {/* Обёртка, а не ссылка: плашка продавца ведёт в его профиль, а вложенная
        * ссылка невалидна и не кликается. Поэтому фото и обе плашки — соседи,
        * позиционируются относительно этой обёртки. */}
      <div className={`relative ${list ? "w-[112px] shrink-0 self-stretch sm:w-[200px]" : ""}`}>
        {/* Списком фото заполняет колонку по высоте ряда. Через h-full этого
          * делать нельзя: при заданном aspect-[4/3] высота начинает определять
          * ШИРИНУ, и фото вылезает из колонки поверх текста. Поэтому оно
          * absolute и растягивается по обёртке, а пропорция снимается. */}
        <Link
          href={href as never}
          className={`group block overflow-hidden bg-muted ${
            list ? "absolute inset-0" : "relative aspect-[4/3]"
          }`}
        >
          {photo ? (
            <Image
              src={photo.url}
              alt={listing.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-muted-foreground">
              <ImageOff className="h-8 w-8" aria-hidden="true" />
              <span className="sr-only">Без фото</span>
            </span>
          )}
        </Link>

        {/* Плашки лежат на фотографии, поэтому .glass-photo: она тёмная в обеих
          * темах — снимок о теме интерфейса не знает.
          *
          * Только слово, без «N из M»: точный остаток на витрине ничего не
          * решает, а календарь на самой позиции скажет точнее. Оттенок точки
          * при этом сохраняет разницу — зелёная значит свободно всё, охряная
          * что часть уже занята. */}
        <span className="glass-photo pointer-events-none absolute left-2 top-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-sm px-2 py-0.5 text-micro font-medium sm:left-2.5 sm:top-2.5 sm:max-w-[calc(100%-1.25rem)] sm:px-2.5 sm:py-1 sm:text-2xs">
          <i className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
          <span className={`truncate ${tone}`}>{busy ? "Занято" : "Свободно"}</span>
        </span>

        {/* max-w и truncate: длинное имя режется многоточием, а не распирает
          * плашку за край фотографии. */}
        <Link
          href={`/u/${listing.ownerUserId}` as never}
          className="glass-photo absolute bottom-2 right-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1 rounded-sm py-0.5 pl-0.5 pr-2 transition-opacity hover:opacity-90 sm:bottom-2.5 sm:right-2.5 sm:max-w-[calc(100%-1.25rem)] sm:gap-1.5 sm:py-1 sm:pl-1 sm:pr-2.5"
        >
          {/* Размер аватара — инлайновые width/height от пропа, классом на
            * брейкпоинте его не ужать; поэтому два, как на витрине продавца.
            * Обёртка именно flex: Avatar — inline-элемент, в строке он сел бы
            * на базовую линию с пустотой под собой, и items-center центрировал
            * бы эту пустоту вместе с ним. */}
          <span className="flex shrink-0 sm:hidden">
            <Avatar src={ownerImage} name={ownerName} size={18} />
          </span>
          <span className="hidden shrink-0 sm:flex">
            <Avatar src={ownerImage} name={ownerName} size={22} />
          </span>
          <span className="min-w-0 truncate text-micro font-medium sm:text-xs">
            {ownerName ?? "Без имени"}
          </span>
          {ownerIsVerified && (
            <BadgeCheck
              className="h-3 w-3 shrink-0 text-primary sm:h-3.5 sm:w-3.5"
              aria-label="Проверенный продавец"
            />
          )}
        </Link>
      </div>

      <div className={`flex min-w-0 flex-1 p-3 ${
        list
          ? "flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
          : "flex-col gap-2.5 sm:gap-3 sm:p-4"
      }`}>
        {/* display:contents в сетке — обёртка не участвует в раскладке, и
          * колонка остаётся ровно такой, какой была. В списке она становится
          * настоящей колонкой, чтобы кнопка встала рядом, а не под ней. */}
        <div className={list ? "flex min-w-0 flex-1 flex-col gap-2" : "contents"}>
        <div>
          {/* Одна строка с многоточием: карточки в ряду обязаны быть одной
            * высоты, иначе вторая строка у одного названия сдвигает вниз цену и
            * характеристики только в этой колонке. */}
          <Link href={href as never} className="block min-w-0">
            <h3 className="truncate text-sm font-semibold leading-snug text-foreground hover:underline sm:text-base">
              {listing.title}
            </h3>
          </Link>
          {price && (
            <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
              <span className="font-mark text-xl font-bold sm:text-2xl">{price.amount}</span>
              <span className="text-xs text-muted-foreground sm:text-sm">{price.unit}</span>
            </p>
          )}
        </div>

        <dl
          className={`border-t border-border text-xs sm:text-sm ${
            list
              ? "flex flex-wrap gap-x-4 gap-y-1 pt-2"
              : "flex flex-col gap-1.5 pt-2.5 sm:pt-3"
          }`}
        >
          {/* Списком на узком экране остаётся только залог — он решает, брать
            * вещь или нет, а три пары в оставшиеся ~200px не встают. С sm
            * ширины хватает, и показываем всё.
            * В значении голое число: «Количество — 3» читается как соседние
            * «Залог — 3 000 ₽» и «Город — Казань». */}
          <SpecRow label="Залог" value={depositValue(listing)} inline={list} />
          <SpecRow
            label="Количество" value={String(listing.quantity)} inline={list}
            className={list ? "hidden sm:flex" : ""}
          />
          <SpecRow
            label="Город" value={cityName} inline={list}
            className={list ? "hidden sm:flex" : ""}
          />
        </dl>
        </div>

        {/* Сеткой mt-auto держит кнопки на одной линии при названиях разной
          * длины. Списком прижимать не к чему — кнопка стоит справа. */}
        <Button asChild size={list ? "sm" : "default"}
          className={list ? "w-full shrink-0 sm:w-fit sm:px-6" : "mt-auto w-full"}>
          <Link href={href as never}>Подробнее</Link>
        </Button>
      </div>
    </article>
  );
}

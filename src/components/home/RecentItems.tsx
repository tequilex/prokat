import { type ListingWithOwner } from "@/server/catalog";
import { ListingCard } from "@/components/catalog/ListingCard";

export function RecentItems({ items, citySlug }: { items: ListingWithOwner[]; citySlug: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Недавно добавленные" className="w-full pt-8 pb-2">
      <h2 className="mb-5 px-4 text-xl font-bold text-foreground sm:px-6 sm:text-2xl lg:px-12">
        Недавно добавленные
      </h2>
      {/* Ряд во всю ширину: левый отступ как у заголовка, справа карточки уходят за край. */}
      <div className="flex gap-4 overflow-x-auto pb-2 pl-4 pr-4 sm:pl-6 lg:pl-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <div key={item.listing.id} className="w-[240px] shrink-0 sm:w-[260px]">
            <ListingCard item={item} citySlug={citySlug} />
          </div>
        ))}
      </div>
    </section>
  );
}

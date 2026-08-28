import Link from "next/link";
import { BadgeCheck, Plus, Settings } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/button";
import { ruPlural } from "@/lib/plural";
import type { AccountIdentity } from "@/components/account/identity";

/* Полоса профиля под обложкой на десктопе: аватар свисает на границу фото,
 * рядом имя, статус и три числа. Рейтинга в модели нет, поэтому метрики —
 * то, что происходит на самом деле: сколько вещей выставлено, сколько аренд
 * состоялось и сколько заявок ждёт ответа прямо сейчас. */
export function AccountHero({
  me,
  pendingCount,
}: {
  me: AccountIdentity;
  pendingCount: number;
}) {
  return (
    <div className="relative -mt-10 hidden items-end gap-5 md:flex">
      {/* Кольцо цвета холста отделяет аватар от фотографии. */}
      <Avatar
        src={me.image}
        name={me.name}
        size={96}
        className="shadow-[0_0_0_4px_var(--color-background)]"
      />

      <div className="min-w-0 flex-1 pb-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="truncate font-display text-[26px] font-extrabold tracking-tight">
            {me.name ?? "Без имени"}
          </span>
          {me.isVerified && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-accent/15 px-2.5 py-0.5 text-sm font-medium text-accent">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Проверенный продавец
            </span>
          )}
        </div>
        {/* Почта видна только владельцу кабинета — публично её нигде нет. */}
        <div className="mt-0.5 truncate text-sm text-muted-foreground">{me.email}</div>
      </div>

      <div className="flex items-center gap-8 pb-2">
        <Metric value={me.activeListings} label={ruPlural(me.activeListings, "объявление", "объявления", "объявлений")} />
        <Metric value={me.deals} label={ruPlural(me.deals, "аренда", "аренды", "аренд")} />
        <Metric value={pendingCount} label={ruPlural(pendingCount, "ждёт ответа", "ждут ответа", "ждут ответа")} accent />
      </div>

      <div className="flex shrink-0 items-center gap-2.5 pb-2">
        <Button asChild>
          <Link href={"/cabinet/listings/new" as never}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Разместить вещь
          </Link>
        </Button>
        <Link
          href={"/profile" as never}
          aria-label="Настройки профиля"
          title="Настройки профиля"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-accent"
        >
          <Settings className="h-[18px] w-[18px]" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

function Metric({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  return (
    <div>
      <div className={`font-mark text-[22px] font-bold leading-tight ${accent ? "text-accent" : ""}`}>
        {value}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

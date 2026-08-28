import Link from "next/link";
import { BadgeCheck, MapPin, CalendarClock } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/button";
import { formatMonthYearGen } from "@/lib/catalog/dates";

// Блок продавца под фото: слева — инфо (аватар, имя-ссылка, проверен, локация,
// на сайте с), справа — карта-заглушка (интеграции карт пока нет).
export function OwnerCard({
  name, href, image, isVerified, location, cityName, createdAt,
}: {
  name: string;
  href: string;
  image: string | null;
  isVerified: boolean;
  location?: string | null;
  cityName: string;
  createdAt: Date;
}) {
  return (
    <div className="surface grid gap-4 p-4 sm:p-5 md:grid-cols-[1fr_280px]">
      <div>
        <div className="flex items-center gap-3.5">
          <Avatar src={image} name={name} size={48} />
          <div className="font-display text-lg font-bold leading-snug sm:text-xl">
            Владелец{" "}
            <Link href={href as never} className="text-accent hover:underline">
              {name}
            </Link>
          </div>
        </div>

        <ul className="mt-5 flex flex-col gap-3 text-base">
          {isVerified && (
            <li className="flex items-center gap-3 text-foreground">
              <BadgeCheck className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
              Проверенный продавец
            </li>
          )}
          <li className="flex items-center gap-3 text-foreground">
            <MapPin className="h-5 w-5 shrink-0" aria-hidden="true" />
            {location ? `${location}, ${cityName}` : cityName}
          </li>
          <li className="flex items-center gap-3 text-foreground">
            <CalendarClock className="h-5 w-5 shrink-0" aria-hidden="true" />
            На сайте с {formatMonthYearGen(createdAt)}
          </li>
        </ul>

        <div className="mt-5 flex gap-2">
          <Button asChild className="h-11 flex-1">
            <Link href={href as never}>Написать</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 flex-1 border-primary bg-transparent text-primary hover:bg-primary/10 hover:text-primary"
          >
            <Link href={href as never}>Профиль продавца</Link>
          </Button>
        </div>
      </div>

      {/* Карта-заглушка (нет интеграции карт), на мобиле не показываем */}
      <div className="relative hidden min-h-[220px] items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground md:flex">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-40 [background-image:linear-gradient(var(--color-border)_1px,transparent_1px),linear-gradient(90deg,var(--color-border)_1px,transparent_1px)] [background-size:20px_20px]"
        />
        <div className="relative flex flex-col items-center gap-1 text-center">
          <MapPin className="h-6 w-6 text-accent" aria-hidden="true" />
          <span className="text-sm font-medium text-foreground">{cityName}</span>
          {location && <span className="text-xs">{location}</span>}
        </div>
      </div>
    </div>
  );
}

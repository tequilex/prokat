import Link from "next/link";
import { Store, BadgeCheck, MapPin, Clock } from "lucide-react";

// Блок владельца на странице объявления: имя-ссылка + бейдж «Проверен»
// (provider.isVerified) + адрес/часы. Презентационный, без логики.
export function OwnerCard({
  name, href, isVerified, address, hoursText,
}: {
  name: string;
  href: string;
  isVerified: boolean;
  address?: string | null;
  hoursText?: string | null;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Store className="h-5 w-5" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={href as never}
            className="font-medium text-foreground hover:underline underline-offset-2"
          >
            {name}
          </Link>
          {isVerified && (
            <span className="inline-flex items-center gap-1 rounded-pill bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Проверен
            </span>
          )}
        </div>

        {address && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            {address}
          </p>
        )}
        {hoursText && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
            {hoursText}
          </p>
        )}
      </div>
    </div>
  );
}

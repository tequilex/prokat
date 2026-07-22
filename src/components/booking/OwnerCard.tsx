import Link from "next/link";
import { User, BadgeCheck, MapPin } from "lucide-react";

// Блок продавца на странице объявления: имя-ссылка на профиль /u/{username}
// + бейдж «Проверен» (users.isVerified) + место выдачи. Презентационный.
export function OwnerCard({
  name, href, isVerified, location,
}: {
  name: string;
  href: string;
  isVerified: boolean;
  location?: string | null;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <User className="h-5 w-5" aria-hidden="true" />
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

        {location && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            {location}
          </p>
        )}
      </div>
    </div>
  );
}

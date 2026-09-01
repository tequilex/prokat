// Разделители внутри ленты. Оба — <li>, потому что лента это <ol>: див между
// пунктами даёт невалидную разметку и врёт скринридеру о числе элементов.

import { ruPlural } from "@/lib/plural";
import { content } from "@theme/content";

export function DateDivider({ label }: { label: string }) {
  return (
    <li className="my-1 flex justify-center">
      <span className="rounded-pill bg-muted px-3 py-1 font-mono text-micro uppercase tracking-mono text-muted-foreground">
        {label}
      </span>
    </li>
  );
}

export function UnreadDivider({ count }: { count: number }) {
  return (
    <li className="my-1 flex items-center gap-3" aria-label={`${content.chat.unreadDivider}: ${count}`}>
      <span aria-hidden="true" className="h-px flex-1 bg-accent/30" />
      <span className="font-mono text-micro uppercase tracking-mono text-accent">
        {content.chat.unreadDivider} · {count} {ruPlural(count, "новое", "новых", "новых")}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-accent/30" />
    </li>
  );
}

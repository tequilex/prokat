"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { content } from "@theme/content";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export interface CityOption {
  slug: string;
  name: string;
}

export function CitySelector({
  cities,
  currentSlug,
}: {
  cities: CityOption[];
  currentSlug?: string;
}) {
  const current = cities.find((c) => c.slug === currentSlug);
  return (
    // modal={false}: без него Radix включает scroll-lock (overflow:hidden на
    // body), из-за чего sticky-хедер пересчитывается и прыгает к началу
    // страницы. См. тот же приём в ThemeToggle/UserMenu.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="inline-flex h-10 items-center gap-1 rounded-pill px-3 text-sm text-foreground transition-colors hover:bg-foreground/5">
        <span className="max-w-[8rem] truncate">{current?.name ?? content.nav.city}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {cities.map((c) => (
          <DropdownMenuItem key={c.slug} asChild>
            <Link href={`/${c.slug}` as never}>{c.name}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

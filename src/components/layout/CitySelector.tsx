"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { content } from "@theme/content";
import { citySwitchHref } from "@/lib/catalog/current-city";
import { useCurrentCity } from "./use-current-city";
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

// Текущий город и адреса перехода считаются здесь, а не приходят из шапки:
// шапка отрисовывается один раз на весь сеанс (корневой layout не
// перерисовывается при навигации), и любое запечённое в неё значение адреса
// протухло бы на первом же переходе.
export function CitySelector({ cities }: { cities: CityOption[] }) {
  const { pathname, search, slug } = useCurrentCity(cities.map((c) => c.slug));
  const current = cities.find((c) => c.slug === slug);

  return (
    // modal={false}: без него Radix включает scroll-lock (overflow:hidden на
    // body), из-за чего sticky-хедер пересчитывается и прыгает к началу
    // страницы. См. тот же приём в UserMenu.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="inline-flex h-9 min-w-0 items-center gap-1 rounded-sm px-3 text-sm text-foreground transition-colors hoverable">
        <span className="min-w-0 max-w-[8rem] truncate">{current?.name ?? content.nav.city}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {cities.map((c) => (
          <DropdownMenuItem key={c.slug} asChild>
            <Link href={citySwitchHref(pathname, search, c.slug) as never}>{c.name}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

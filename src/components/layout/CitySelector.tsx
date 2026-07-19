"use client";

import Link from "next/link";
import { MapPin, ChevronDown } from "lucide-react";
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
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted">
        <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
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

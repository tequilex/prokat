"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { content } from "@theme/content";
import { fieldWithin } from "@/components/ui/field";
import { useCurrentCity } from "./use-current-city";

export function HeaderSearch({
  className = "",
  // Слаги активных городов — чтобы узнать город в адресе и не принять за него
  // первый попавшийся сегмент вроде /cabinet. Без города поиск уходил бы в
  // город по умолчанию, и листающий Петербург получал бы выдачу Казани.
  cities = [],
}: {
  className?: string;
  cities?: readonly string[];
}) {
  const router = useRouter();
  const { slug: city } = useCurrentCity(cities);
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className={`${fieldWithin} flex h-9 w-full items-center gap-2 pl-3 pr-1 ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        const params = new URLSearchParams();
        const query = q.trim();
        if (query) params.set("q", query);
        if (city) params.set("city", city);
        const qs = params.toString();
        router.push(qs ? `/search?${qs}` : "/search");
      }}
    >
      <input
        type="search"
        aria-label={content.nav.search}
        placeholder={content.nav.searchPlaceholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      {/* Единственная лупа — и есть кнопка: как «Найти» в герое, зелёная справа.
        * Декоративной слева больше нет, чтобы не было двух луп в одном поле. */}
      <button
        type="submit"
        aria-label={content.nav.search}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-primary text-primary-foreground transition-transform active:scale-[0.94]"
      >
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </form>
  );
}

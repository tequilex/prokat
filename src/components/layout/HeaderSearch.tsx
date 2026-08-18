"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { content } from "@theme/content";

export function HeaderSearch({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className={`glass flex h-12 w-full items-center gap-2 rounded-pill pl-4 pr-1.5 ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
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
        * Декоративной слева больше нет, чтобы не было двух луп в одной пилюле. */}
      <button
        type="submit"
        aria-label={content.nav.search}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-[0.94]"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}

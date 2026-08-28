"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { content } from "@theme/content";

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className="flex w-full items-center gap-2 rounded-lg border border-white/15 bg-black/40 p-2.5 pl-5 backdrop-blur-md"
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
      }}
    >
      <Search className="h-5 w-5 shrink-0 text-white/70" aria-hidden="true" />
      <input
        type="search"
        aria-label={content.nav.search}
        placeholder={content.home.heroSearchPlaceholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="h-12 w-full bg-transparent text-base text-white outline-none placeholder:text-white/60 sm:text-lg"
      />
      <button
        type="submit"
        className="h-12 shrink-0 rounded-lg bg-primary px-6 text-base font-semibold text-primary-foreground transition-transform active:scale-[0.97]"
      >
        {content.nav.search}
      </button>
    </form>
  );
}

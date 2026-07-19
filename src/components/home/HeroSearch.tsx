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
      className="mx-auto flex w-full max-w-xl items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
      }}
    >
      <Search className="ml-2 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <input
        type="search"
        aria-label={content.nav.search}
        placeholder={content.home.heroSearchPlaceholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="h-10 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
      />
      <button
        type="submit"
        className="h-10 shrink-0 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.97]"
      >
        {content.nav.search}
      </button>
    </form>
  );
}

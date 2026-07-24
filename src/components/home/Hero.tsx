import Link from "next/link";
import { content } from "@theme/content";
import { HeroSearch } from "./HeroSearch";

export interface HeroChip {
  slug: string;
  name: string;
}

export function Hero({ citySlug, chips = [] }: { citySlug?: string; chips?: HeroChip[] }) {
  return (
    <section className="px-4 py-12 text-center md:py-16">
      <h1 className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight md:text-4xl">
        {content.home.heroTitle}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{content.home.heroSubtitle}</p>
      <div className="mt-6">
        <HeroSearch />
      </div>
      {citySlug && chips.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {chips.map((c) => (
            <Link
              key={c.slug}
              href={`/${citySlug}/${c.slug}` as never}
              className="rounded-full border border-border bg-card px-4 py-1.5 text-sm text-foreground transition-transform hover:border-primary active:scale-[0.97]"
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

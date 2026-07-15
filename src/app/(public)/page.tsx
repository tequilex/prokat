import { content } from "@theme/content";

// Временная главная. Настоящая (поиск + выбор города + категории)
// появится вместе с публичным каталогом.
export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold mb-4">{content.site.name}</h1>
      <p className="text-muted-foreground">{content.site.tagline}</p>
    </main>
  );
}

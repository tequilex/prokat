import { content } from "@theme/content";

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-[calc(var(--header-h)+16px)]">
      <h2 className="mb-5 text-xl font-semibold text-foreground">{content.home.howHeading}</h2>
      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {content.home.howSteps.map((step, i) => (
          <li key={step.title} className="rounded-2xl border border-border bg-card p-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
              {i + 1}
            </span>
            <h3 className="mt-3 font-medium text-foreground">{step.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

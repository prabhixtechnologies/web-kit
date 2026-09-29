import * as React from "react";

/**
 * One photographable block.
 *
 * `data-shot` is the handle the visual tests use, so the name is part of the contract: renaming
 * one orphans its baseline, and the suite says so rather than quietly comparing nothing.
 *
 * The heading is rendered as a plain div rather than an `h2` on purpose. A one-h1-per-page gate
 * runs across these repositories, and a gallery with forty headings is not a document - the
 * labels here are furniture.
 */
export function Shot({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <section data-shot={name} className="border-b border-border px-6 py-5 last:border-b-0">
      <div className="mb-3 font-mono text-[11px] uppercase tracking-widest text-text-faint">
        {name}
      </div>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </section>
  );
}

/** A labelled column inside a shot, for showing a set of variants side by side. */
export function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="text-[10px] uppercase tracking-wider text-text-faint">{label}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

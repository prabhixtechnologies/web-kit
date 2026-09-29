import { LABELS } from "./brands";
import { Controls } from "./sections/controls";
import { Feedback } from "./sections/feedback";
import { Nested } from "./sections/nested";
import { Overlays } from "./sections/overlays";
import { Structure } from "./sections/structure";

/**
 * Every primitive on one page, under one brand.
 *
 * The brand, mode and density come from the URL rather than from a control on the page. A
 * screenshot has to be reproducible from its address alone, and a picker would put a piece of
 * chrome in every shot that no product has.
 */
export function Gallery({ brand, mode, density }: { brand: string; mode: string; density: string }) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border bg-surface-raised px-6 py-4">
        <div className="font-display text-xl text-text">{LABELS[brand] ?? brand}</div>
        <div className="mt-1 font-mono text-[11px] uppercase tracking-widest text-text-faint">
          {brand} · {mode} · {density}
        </div>
      </header>
      <main>
        <Controls />
        <Structure />
        <Feedback />
        <Nested />
        <Overlays />
      </main>
    </div>
  );
}

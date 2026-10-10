"use client";

import * as Popover from "@radix-ui/react-popover";
import Link from "next/link";
import { INFO } from "@/lib/info";

// The "i" button: tap or click for What, Why and How. Keyboard: Tab, Enter, Escape.
// The visible circle is 20 px; an invisible ring extends the touch target to 44 px.
export function Info({ id, className = "" }: { id: string; className?: string }) {
  const e = INFO[id];
  if (!e) throw new Error(`Unknown info id: ${id}`);
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`More about ${e.title}`}
          className={`info-btn relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-info/40 bg-info-soft align-middle font-serif text-[12px] font-semibold italic leading-none text-info transition hover:scale-105 hover:border-info ${className}`}
        >
          i
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          collisionPadding={12}
          className="z-50 w-[min(92vw,22rem)] rounded-xl border border-border bg-bg p-4 text-left text-sm font-normal not-italic shadow-pop"
        >
          <p className="mb-2 font-semibold text-text">{e.title}</p>
          <dl className="space-y-2 text-muted">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-text/70">What</dt>
              <dd>{e.what}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-text/70">Why it matters</dt>
              <dd>{e.why}</dd>
            </div>
            {e.how && (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-text/70">How</dt>
                <dd>{e.how}</dd>
              </div>
            )}
          </dl>
          {e.learnMore && (
            <Link href={e.learnMore.href} className="mt-3 inline-block font-medium text-accent hover:underline">
              {e.learnMore.label}
            </Link>
          )}
          <Popover.Arrow className="fill-border" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

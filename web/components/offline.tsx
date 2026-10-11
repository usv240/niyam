import Link from "next/link";
import { ButtonLink } from "./ui";

// Shown when the live server cannot be reached. Plain words first, then what still works.
export function OfflineNotice({ what }: { what: string }) {
  return (
    <div role="status" className="rounded-2xl border border-warning/30 bg-warning-soft p-5">
      <p className="font-semibold text-text">The live server is offline right now, so {what} is paused.</p>
      <p className="mt-1 text-sm text-muted">
        Everything else on this site works without it: checking eligibility, exploring the rules with their sources, and replaying a real
        run. The server may be restarting; try again in a few minutes.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <ButtonLink href="/demo/">Replay a real run (no server needed)</ButtonLink>
        <ButtonLink href="/check/" variant="secondary">Check eligibility</ButtonLink>
        <ButtonLink href="https://github.com/usv240/niyam#use-it" external variant="secondary">Run Niyam yourself (source code)</ButtonLink>
      </div>
      <p className="mt-3 text-xs text-muted">The recorded run used the real Ladki Bahin amendment of 3 July 2024 (<Link href="/judges/" className="underline underline-offset-2">evidence</Link>).</p>
    </div>
  );
}

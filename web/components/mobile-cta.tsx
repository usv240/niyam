"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Phone only: the two main actions stay in thumb reach once the hero has scrolled away.
export function MobileCta() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/90 p-3 backdrop-blur-md transition-transform duration-200 lg:hidden ${show ? "translate-y-0" : "translate-y-full"}`}
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-md gap-2">
        <Link tabIndex={show ? 0 : -1} href="/demo/" className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-accent-contrast">Watch it work</Link>
        <Link tabIndex={show ? 0 : -1} href="/check/" className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border bg-surface text-sm font-semibold">Check eligibility</Link>
      </div>
    </div>
  );
}

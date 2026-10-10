"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV } from "@/lib/site";
import { ThemeToggle } from "./theme";
import { Container } from "./ui";

export function Logo() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2 font-semibold tracking-tight" aria-label="Niyam home">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-contrast shadow-card">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <path d="M5 7h14M5 12h9M5 17h5" strokeLinecap="round" />
          <path d="m15 16 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-lg">Niyam</span>
      <span className="deva hidden text-sm font-normal text-muted sm:inline">नियम</span>
    </Link>
  );
}

export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-bg focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={path === n.href ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${path === n.href ? "bg-surface text-text" : "text-muted hover:text-text"}`}
            >
              {n.label}
            </Link>
          ))}
          <Link href="/judges/" className={`ml-1 rounded-md border border-accent/40 px-3 py-1.5 text-sm font-semibold text-accent transition hover:bg-accent-soft ${path === "/judges/" ? "bg-accent-soft" : ""}`}>
            For judges
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <button className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" aria-hidden />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
              <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(86vw,22rem)] flex-col gap-1 border-l border-border bg-bg p-5 shadow-pop">
                <div className="mb-4 flex items-center justify-between">
                  <Dialog.Title className="font-semibold">Menu</Dialog.Title>
                  <Dialog.Close className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border" aria-label="Close menu">
                    <X className="h-5 w-5" aria-hidden />
                  </Dialog.Close>
                </div>
                {[...NAV, { href: "/try/", label: "Try your own document" }, { href: "/trust/", label: "Trust and limits" }, { href: "/judges/", label: "For judges" }].map((n) => (
                  <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-base font-medium hover:bg-surface">
                    {n.label}
                  </Link>
                ))}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </Container>
    </header>
  );
}

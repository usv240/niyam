import Link from "next/link";
import { AlertTriangle, CheckCircle2, CircleHelp, Info as InfoIcon, XCircle } from "lucide-react";

export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>;
}

export function Section({ id, eyebrow, title, intro, children, className = "" }: {
  id?: string; eyebrow?: string; title: React.ReactNode; intro?: React.ReactNode; children?: React.ReactNode; className?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-24 py-16 sm:py-24 ${className}`}>
      <Container>
        {eyebrow && <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>}
        <h2 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
        {intro && <div className="mt-4 max-w-2xl text-lg text-muted">{intro}</div>}
        {children && <div className="mt-10">{children}</div>}
      </Container>
    </section>
  );
}

export function PageHeader({ eyebrow, title, intro, children }: { eyebrow: string; title: React.ReactNode; intro: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="relative overflow-hidden border-b border-border">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <Container className="relative py-14 sm:py-20">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        <div className="mt-4 max-w-2xl text-lg text-muted">{intro}</div>
        {children && <div className="mt-8">{children}</div>}
      </Container>
    </header>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-surface p-6 shadow-card ${className}`}>{children}</div>;
}

export function ButtonLink({ href, children, variant = "primary", external = false }: {
  href: string; children: React.ReactNode; variant?: "primary" | "secondary" | "ghost"; external?: boolean;
}) {
  const styles = {
    primary: "bg-accent text-accent-contrast hover:opacity-90 shadow-card",
    secondary: "border border-border bg-bg text-text hover:bg-surface",
    ghost: "text-accent hover:underline",
  }[variant];
  const cls = `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition ${styles}`;
  return external ? (
    <a href={href} className={cls} target="_blank" rel="noreferrer">{children}</a>
  ) : (
    <Link href={href} className={cls}>{children}</Link>
  );
}

export type Tone = "success" | "warning" | "danger" | "info" | "neutral";
const TONES: Record<Tone, string> = {
  success: "bg-success-soft text-success border-success/30",
  warning: "bg-warning-soft text-warning border-warning/30",
  danger: "bg-danger-soft text-danger border-danger/30",
  info: "bg-info-soft text-info border-info/30",
  neutral: "bg-surface-2 text-muted border-border",
};
const ICONS = { success: CheckCircle2, warning: AlertTriangle, danger: XCircle, info: InfoIcon, neutral: CircleHelp };

// Status is never shown by colour alone: always an icon and a word.
export function Badge({ tone = "neutral", children, icon = true }: { tone?: Tone; children: React.ReactNode; icon?: boolean }) {
  const Icon = ICONS[tone];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
      {icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {children}
    </span>
  );
}

export function Callout({ tone = "info", title, children }: { tone?: Tone; title?: string; children: React.ReactNode }) {
  const Icon = ICONS[tone];
  return (
    <div className={`flex gap-3 rounded-xl border p-4 text-sm ${TONES[tone]}`} role="note">
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="text-text">
        {title && <p className="mb-1 font-semibold">{title}</p>}
        <div className="text-muted">{children}</div>
      </div>
    </div>
  );
}

export function Stat({ value, label, source, href }: { value: React.ReactNode; label: React.ReactNode; source?: string; href?: string }) {
  return (
    <div>
      <p className="text-3xl font-semibold tracking-tight sm:text-4xl">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
      {source && (href ? (
        <a href={href} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-accent hover:underline">{source}</a>
      ) : (
        <p className="mt-1 text-xs text-muted">{source}</p>
      ))}
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <code className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>;
}

export function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer" className="font-medium text-accent underline decoration-accent/50 underline-offset-2 hover:decoration-accent">{children}</a>;
}

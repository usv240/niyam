"use client";

import { Check, Copy, KeyRound, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { API_BASE, API_ENABLED, apiCall, apiHealth, type ApiError } from "@/lib/api";
import { Info } from "./info";
import { OfflineNotice } from "./offline";
import { Callout } from "./ui";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-bg px-2.5 text-xs font-medium"
      aria-label={`${label} to clipboard`}
    >
      {done ? <Check className="h-3.5 w-3.5 text-success" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />} {done ? "Copied" : label}
    </button>
  );
}

export function KeyCard() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  useEffect(() => { apiHealth().then((h) => setOnline(Boolean(h?.ok))); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await apiCall<{ key: string }>("/api/v1/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, contact: contact || null }) });
      setKey(r.key);
      localStorage.setItem("niyam_key", r.key);
    } catch (x) { setErr(x as ApiError); } finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="mb-3 flex items-center gap-2 font-semibold"><KeyRound className="h-5 w-5 text-accent" aria-hidden /> Create a free API key <Info id="api-key" /></p>
      {online === false && <OfflineNotice what="creating API keys" />}
      {key ? (
        <div className="space-y-3">
          <Callout tone="success" title="Copy this key now. It will not be shown again.">Only a hash is stored on our side. This browser also remembers it for the upload page.</Callout>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-bg p-3">
            <code className="flex-1 break-all font-mono text-sm">{key}</code>
            <CopyButton text={key} />
          </div>
        </div>
      ) : (
        <form onSubmit={create} className="space-y-3">
          <label className="flex flex-col gap-1 text-sm font-medium">What will you use it for?
            <input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="For example: helpline chatbot for our NGO" className="min-h-11 rounded-lg border border-border bg-bg px-3 font-normal" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">Contact (optional, only to tell you about changes)
            <input maxLength={120} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="you@example.org" className="min-h-11 rounded-lg border border-border bg-bg px-3 font-normal" />
          </label>
          <button disabled={busy || online === false} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-semibold text-accent-contrast disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Create key
          </button>
          {err && <Callout tone="danger" title="That did not work">{err.message}</Callout>}
        </form>
      )}
    </div>
  );
}

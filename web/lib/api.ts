"use client";

import { SITE } from "./site";

// The live API is optional: the site works fully without it, from build-time data.
// NEXT_PUBLIC_API_BASE: empty = no live API, "same-origin" = the API is on the same server, or a full URL.
export const API_ENABLED = SITE.apiBase !== "";
export const API_BASE = SITE.apiBase === "same-origin" ? "" : SITE.apiBase.replace(/\/$/, "");

export async function apiHealth(): Promise<{ ok: boolean; rulebook_version?: string } | null> {
  if (!API_ENABLED) return null;
  try {
    const r = await fetch(`${API_BASE}/api/v1/health`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

export type ApiError = { code: string; message: string; docs_url?: string };

export async function apiCall<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, init);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw (body.error as ApiError) || { code: "http_" + r.status, message: `Request failed (${r.status})` };
  return body as T;
}

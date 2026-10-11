"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { LANGS, type Lang } from "@/lib/i18n";

// One language choice for the whole site, remembered on this device.
// Hindi and Marathi text is always shown with English next to it.
const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "en", setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const saved = localStorage.getItem("niyam_lang") as Lang | null;
    if (saved === "hi" || saved === "mr") setLangState(saved);
  }, []);
  const setLang = (l: Lang) => { setLangState(l); localStorage.setItem("niyam_lang", l); };
  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

export function LangToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <div role="radiogroup" aria-label="Language: English, Hindi or Marathi" className="inline-flex rounded-lg border border-border bg-surface p-0.5">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          role="radio"
          aria-checked={lang === l.code}
          onClick={() => setLang(l.code)}
          title={l.code === "en" ? "English" : l.code === "hi" ? "Hindi" : "Marathi"}
          className={`min-h-8 rounded-md px-2.5 text-xs font-semibold transition ${lang === l.code ? "bg-bg text-text shadow-card" : "text-muted hover:text-text"}`}
        >
          {compact ? (l.code === "en" ? "EN" : l.code === "hi" ? "हिं" : "मरा") : l.label}
        </button>
      ))}
    </div>
  );
}

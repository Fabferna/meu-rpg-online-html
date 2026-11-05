"use client";

import { createContext, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LANG_COOKIE, LANG_INFO, LANGS, type Lang } from "./config";
import { makeT, type Dict, type TFn } from "./translate";

const Ctx = createContext<TFn>(makeT("pt", {}));

export function I18nProvider({ lang, dict, children }: { lang: Lang; dict: Dict; children: React.ReactNode }) {
  const t = useMemo(() => makeT(lang, dict), [lang, dict]);
  return <Ctx.Provider value={t}>{children}</Ctx.Provider>;
}

/** Função de tradução para componentes do cliente: const t = useT(); t("Missões"). */
export const useT = () => useContext(Ctx);

/** Seletor de idioma (🇧🇷 🇪🇸 🇨🇳). Grava a escolha num cookie e recarrega os textos. */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const router = useRouter();
  function choose(l: Lang) {
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.refresh();
  }
  return (
    <div className="flex gap-1" role="group" aria-label={t("Idioma")}>
      {LANGS.map((l) => (
        <button key={l} type="button" onClick={() => choose(l)} aria-pressed={t.lang === l} title={LANG_INFO[l].label}
          className={`flex items-center rounded-md px-1.5 py-1 text-sm transition ${t.lang === l ? "bg-white/15 ring-1 ring-gold/60" : "opacity-60 hover:opacity-100"}`}>
          <Flag lang={l} />{!compact && <span className="ml-1 text-xs">{LANG_INFO[l].label}</span>}
        </button>
      ))}
    </div>
  );
}

/** Bandeiras em SVG: o Windows não exibe emojis de bandeira. */
function Flag({ lang }: { lang: Lang }) {
  const c = "block h-3.5 w-5 overflow-hidden rounded-[2px] shadow-sm";
  if (lang === "pt") return (
    <svg viewBox="0 0 20 14" className={c} aria-hidden><rect width="20" height="14" fill="#009c3b" /><path d="M10 1.6 18.2 7 10 12.4 1.8 7z" fill="#ffdf00" /><circle cx="10" cy="7" r="3.2" fill="#002776" /></svg>
  );
  if (lang === "en") return (
    <svg viewBox="0 0 20 14" className={c} aria-hidden><rect width="20" height="14" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((y) => <rect key={y} y={y} width="20" height="1.08" fill="#b22234" />)}
      <rect width="9" height="7.5" fill="#3c3b6e" /></svg>
  );
  if (lang === "es") return (
    <svg viewBox="0 0 20 14" className={c} aria-hidden><rect width="20" height="14" fill="#aa151b" /><rect y="3.5" width="20" height="7" fill="#f1bf00" /></svg>
  );
  return (
    <svg viewBox="0 0 20 14" className={c} aria-hidden><rect width="20" height="14" fill="#de2910" /><path d="m4 2 .7 2.1h2.2L5.1 5.4l.7 2.1L4 6.2 2.2 7.5l.7-2.1L1.1 4.1h2.2z" fill="#ffde00" /></svg>
  );
}

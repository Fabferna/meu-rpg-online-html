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
          className={`rounded-md px-1.5 py-0.5 text-sm transition ${t.lang === l ? "bg-white/15 ring-1 ring-gold/60" : "opacity-60 hover:opacity-100"}`}>
          {LANG_INFO[l].flag}{!compact && <span className="ml-1 text-xs">{LANG_INFO[l].label}</span>}
        </button>
      ))}
    </div>
  );
}

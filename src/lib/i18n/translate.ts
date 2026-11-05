import { DEFAULT_LANG, LANG_INFO, type Lang } from "./config";

export type Dict = Record<string, string>;
export type TFn = ((text: string, vars?: Record<string, string | number>) => string) & { lang: Lang; locale: string };

/** Cria a função de tradução. Sem tradução cadastrada, devolve o texto original em português. */
export function makeT(lang: Lang, dict: Dict): TFn {
  const fn = ((text: string, vars?: Record<string, string | number>) => {
    let out = lang === DEFAULT_LANG ? text : (dict[text] ?? text);
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
    return out;
  }) as TFn;
  fn.lang = lang;
  fn.locale = LANG_INFO[lang].locale;
  return fn;
}

// Idiomas do jogo. O português é o idioma-base: os textos do código são
// as próprias chaves de tradução (ex.: t("Missões") → "Misiones" / "任务").
export const LANGS = ["pt", "en", "es", "zh"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "pt";
export const LANG_COOKIE = "lang";

export const LANG_INFO: Record<Lang, { label: string; flag: string; html: string; locale: string; ogLocale: string }> = {
  pt: { label: "Português", flag: "🇧🇷", html: "pt-BR", locale: "pt-BR", ogLocale: "pt_BR" },
  en: { label: "English", flag: "🇺🇸", html: "en", locale: "en-US", ogLocale: "en_US" },
  es: { label: "Español", flag: "🇪🇸", html: "es", locale: "es-ES", ogLocale: "es_ES" },
  zh: { label: "中文", flag: "🇨🇳", html: "zh-CN", locale: "zh-CN", ogLocale: "zh_CN" },
};

export const isLang = (v: unknown): v is Lang => typeof v === "string" && (LANGS as readonly string[]).includes(v);

/** Escolhe o idioma pelo cabeçalho Accept-Language do navegador. */
export function langFromAcceptLanguage(header: string | null | undefined): Lang {
  if (!header) return DEFAULT_LANG;
  for (const part of header.split(",")) {
    const code = part.split(";")[0].trim().toLowerCase();
    if (code.startsWith("pt")) return "pt";
    if (code.startsWith("en")) return "en";
    if (code.startsWith("es")) return "es";
    if (code.startsWith("zh")) return "zh";
  }
  // Outros idiomas: inglês; o jogador pode trocar no seletor.
  return "en";
}

import "server-only";
import { cookies, headers } from "next/headers";
import { isLang, langFromAcceptLanguage, LANG_COOKIE, type Lang } from "./config";
import { loadDict } from "./dicts";
import { makeT } from "./translate";

/** Idioma do visitante: cookie escolhido no seletor → idioma do navegador → português. */
export async function getLang(): Promise<Lang> {
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  if (isLang(c)) return c;
  return langFromAcceptLanguage((await headers()).get("accept-language"));
}

export async function getT() {
  const lang = await getLang();
  return makeT(lang, await loadDict(lang));
}

import "server-only";
import type { Lang } from "./config";
import type { Dict } from "./translate";

// Carrega só o dicionário do idioma pedido (o navegador recebe apenas um).
export async function loadDict(lang: Lang): Promise<Dict> {
  if (lang === "en") return (await import("./dict/en.json")).default as Dict;
  if (lang === "es") return (await import("./dict/es.json")).default as Dict;
  if (lang === "zh") return (await import("./dict/zh.json")).default as Dict;
  return {};
}

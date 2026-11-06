// Lista textos t("...") do código que ainda não têm tradução no dicionário EN (e ES/ZH).
// Uso: node scripts/i18n-missing.mjs [chaves-extras...]
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.(tsx?|mjs)$/.test(f) && files.push(p); } };
walk("src");
const keys = new Set(process.argv.slice(2));
const re = /\bt\(\s*"((?:[^"\\]|\\.)*)"/g;
for (const f of files) for (const m of readFileSync(f, "utf8").matchAll(re)) keys.add(JSON.parse(`"${m[1]}"`));
const dicts = ["en", "es", "zh"].map((l) => [l, JSON.parse(readFileSync(`src/lib/i18n/dict/${l}.json`, "utf8"))]);
const missing = [...keys].filter((k) => /[A-Za-zÀ-ú]/.test(k) && dicts.some(([, d]) => !(k in d)));
console.log(missing.length ? missing.join("\n") : "OK: tudo traduzido.");
process.exitCode = missing.length ? 1 : 0;

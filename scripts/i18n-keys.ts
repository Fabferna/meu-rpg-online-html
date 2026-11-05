// Gera a lista de textos traduzíveis: npx tsx --conditions=react-server scripts/i18n-keys.ts
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { RACES, REGIONS } from "../src/lib/game/data";
import { QUESTS } from "../src/lib/game/quests";
import { ENEMIES } from "../src/lib/game/enemies";
import { CHAPTERS, SPEAKERS } from "../src/lib/game/story";
import { REGIONS_MAP } from "../src/lib/game/regions";
import { ITEMS } from "../src/lib/game/items";
import { PETS } from "../src/lib/game/pets";
import { COSMETICS, GEM_PACKS, STARTER_PACK, CONVENIENCE, DAILY_POOL, LOGIN_MILESTONES } from "../src/lib/shop/catalog";
import { DAILY_GOALS, ACHIEVEMENTS } from "../src/lib/game/goals";
import { RACIAL_SKILLS } from "../src/lib/game/racial";
import { GUILD_BOSSES } from "../src/lib/game/guildBoss";
import { DUNGEONS } from "../src/lib/game/dungeons";
import { PASS_REWARDS } from "../src/lib/game/seasonPass";
import { WEEKLY_REWARDS } from "../src/lib/game/weekly";
import { ROLE_LABEL } from "../src/lib/game/guilds";
import { SITE } from "../src/lib/site";

const keys = new Set<string>();
const add = (s?: string | null) => { if (s && /[A-Za-zÀ-ÿ]/.test(s)) keys.add(s); };
const parse = (q: string) => { try { return JSON.parse(q) as string; } catch { return ""; } };

// 1) t("...") no código
const files: string[] = [];
const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) { if (!p.includes("admin") && !p.includes("/api/")) walk(p); } else if (/\.(tsx?|ts)$/.test(f)) files.push(p); } };
walk("src");
const T = /(?<![\w.])(?:t|tr)\(\s*("(?:[^"\\\n]|\\.)*")/g;
for (const f of files) for (const m of readFileSync(f, "utf8").matchAll(T)) add(parse(m[1]));

// 2) mapas de rótulos em componentes (label/hint/title/text: "...") e mensagens fixas
const LIT = /\b(label|hint|title|text|name|description)\s*:\s*("(?:[^"\\\n]|\\.)*")/g;
for (const f of files.filter((f) => f.includes("components/game") || f.includes("app/login") || f.includes("criar-personagem")))
  for (const m of readFileSync(f, "utf8").matchAll(LIT)) add(parse(m[2]));
for (const f of ["src/components/game/api.ts", "src/components/game/Inventory.tsx", "src/components/game/Shop.tsx", "src/components/game/Battle.tsx", "src/components/game/Ranking.tsx", "src/components/game/Guild.tsx", "src/components/game/Forge.tsx", "src/components/game/Pets.tsx", "src/app/login/LoginForm.tsx", "src/app/criar-personagem/CharacterCreator.tsx"]) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/(?:\w+:\s*|return |\["\w+",\s*|\?\?\s*\n?\s*)("(?:[^"\\\n]|\\.)*")/g)) { const s = parse(m[1]); if (/[a-zà-ÿ]{2,}/i.test(s) && /\s|[ÀÁÂÃÉÊÍÓÔÕÚÇàáâãéêíóôõúç]|^[A-ZÀ-Ú][a-zà-ÿ]+$/.test(s) && !/^[\w-]+$/.test(s.replace(/[À-ÿ]/g, "")) || /^[A-ZÀ-Ú][a-zà-ÿ]+$/.test(s)) add(s); }
}

// 3) conteúdo do jogo
for (const r of Object.values(RACES)) { add(r.name); add(r.description); add(r.bonus); }
for (const r of Object.values(REGIONS)) { add(r.name); add(r.description); }
for (const q of QUESTS) { add(q.title); add(q.description); }
for (const e of ENEMIES) add(e.name);
for (const c of CHAPTERS) { add(c.title); add(c.victory); c.scenes.forEach((s) => add(s.text)); }
for (const s of Object.values(SPEAKERS)) add(s.name);
for (const r of REGIONS_MAP) { add(r.name); add(r.description); }
for (const i of ITEMS) add(i.name);
for (const p of PETS) { add(p.name); add(p.description); }
for (const c of COSMETICS) add(c.name);
for (const p of [...GEM_PACKS, STARTER_PACK]) { add(p.name); p.extras?.forEach(add); }
for (const d of [...CONVENIENCE, ...DAILY_POOL]) { add(d.name); add(d.description); }
for (const m of LOGIN_MILESTONES) { add(m.label); add(m.reward); }
for (const g of DAILY_GOALS) add(g.title);
for (const a of ACHIEVEMENTS) { add(a.title); add(a.description); }
for (const r of Object.values(RACIAL_SKILLS)) { add(r.name); add(r.description); }
for (const b of GUILD_BOSSES) { add(b.name); add(b.lore); }
for (const d of DUNGEONS) { add(d.name); add(d.description); }
for (const r of PASS_REWARDS) { add(r.free.label); add(r.premium.label); }
for (const w of WEEKLY_REWARDS) add(w.label);
Object.values(ROLE_LABEL).forEach(add);
add(SITE.updatedAt); add("Fim de Semana Heroico"); add("Participação");
// nomes de itens vindos do banco (iguais aos do catálogo) e títulos de cosméticos já cobertos acima

const list = [...keys].sort();
writeFileSync("scripts/i18n-keys.json", JSON.stringify(list, null, 1));
console.log(list.length, "textos");

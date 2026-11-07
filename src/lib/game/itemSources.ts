// De onde vem cada item: derivado automaticamente dos catálogos de inimigos, masmorras, missões e história.
// Nada aqui é escrito à mão — adicionar um drop em enemies.ts já faz ele aparecer na Forja.
import { ENEMIES } from "./enemies";
import { lootTable } from "./loot";
import { DUNGEONS } from "./dungeons";
import { QUESTS } from "./quests";
import { CHAPTERS } from "./story";
import { DAILY_POOL } from "../shop/catalog";
import { ALL_WORLD_BOSS_ITEMS, itemChance } from "./worldBoss";

export type ItemSource =
  | { kind: "enemy"; name: string; chance: number; minLevel: number; boss?: boolean }
  | { kind: "dungeon"; name: string; chance: number; minLevel: number }
  | { kind: "quest"; name: string; chance: number; minLevel: number }
  | { kind: "story"; name: string; chapter: number; minLevel: number }
  | { kind: "deal"; name: string }
  | { kind: "worldboss"; name: string; chance: number; minLevel: number };

function build() {
  const map: Record<string, ItemSource[]> = {};
  const add = (id: string, s: ItemSource) => (map[id] ??= []).push(s);
  // Caçada: a mesma tabela de saque usada no sorteio (loot.ts), já com o drop especial somado.
  for (const e of ENEMIES) if (!e.story) for (const l of lootTable(e)) if (l.kind !== "potion") add(l.item, { kind: "enemy", name: e.name, chance: l.chance, minLevel: e.minLevel, boss: e.boss });
  for (const d of DUNGEONS) if (d.chest.item) add(d.chest.item.id, { kind: "dungeon", name: d.name, chance: d.chest.item.chance, minLevel: d.minLevel });
  for (const q of QUESTS) if (q.drop) add(q.drop.item, { kind: "quest", name: q.title, chance: q.drop.chance, minLevel: q.minLevel });
  for (const c of CHAPTERS) if (c.rewards.item) add(c.rewards.item, { kind: "story", name: c.title, chapter: c.n, minLevel: c.minLevel });
  for (const d of DAILY_POOL) if (d.item) add(d.item.id, { kind: "deal", name: d.name });
  // Chefe do Mundo: chance de quem não está no top 10, dividida entre arma e acessório da raça.
  for (const id of ALL_WORLD_BOSS_ITEMS) add(id, { kind: "worldboss", name: "Chefe do Mundo (21h)", chance: itemChance(99) / 2, minLevel: 1 });
  // Garantidos primeiro (história), depois por chance.
  for (const list of Object.values(map)) list.sort((a, b) => (b.kind === "story" ? 2 : "chance" in b ? b.chance : 0) - (a.kind === "story" ? 2 : "chance" in a ? a.chance : 0));
  return map;
}

export const ITEM_SOURCES: Record<string, ItemSource[]> = build();

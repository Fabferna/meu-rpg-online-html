// De onde vem cada item: derivado automaticamente dos catálogos de inimigos, masmorras, missões e história.
// Nada aqui é escrito à mão — adicionar um drop em enemies.ts já faz ele aparecer na Forja.
import { ENEMIES } from "./enemies";
import { DUNGEONS } from "./dungeons";
import { QUESTS } from "./quests";
import { CHAPTERS } from "./story";
import { DAILY_POOL } from "../shop/catalog";

export type ItemSource =
  | { kind: "enemy"; name: string; chance: number; minLevel: number; boss?: boolean }
  | { kind: "dungeon"; name: string; chance: number; minLevel: number }
  | { kind: "quest"; name: string; chance: number; minLevel: number }
  | { kind: "story"; name: string; chapter: number; minLevel: number }
  | { kind: "deal"; name: string };

function build() {
  const map: Record<string, ItemSource[]> = {};
  const add = (id: string, s: ItemSource) => (map[id] ??= []).push(s);
  for (const e of ENEMIES) if (e.drop && !e.story) add(e.drop.item, { kind: "enemy", name: e.name, chance: e.drop.chance, minLevel: e.minLevel, boss: e.boss });
  for (const d of DUNGEONS) if (d.chest.item) add(d.chest.item.id, { kind: "dungeon", name: d.name, chance: d.chest.item.chance, minLevel: d.minLevel });
  for (const q of QUESTS) if (q.drop) add(q.drop.item, { kind: "quest", name: q.title, chance: q.drop.chance, minLevel: q.minLevel });
  for (const c of CHAPTERS) if (c.rewards.item) add(c.rewards.item, { kind: "story", name: c.title, chapter: c.n, minLevel: c.minLevel });
  for (const d of DAILY_POOL) if (d.item) add(d.item.id, { kind: "deal", name: d.name });
  // Garantidos primeiro (história), depois por chance.
  for (const list of Object.values(map)) list.sort((a, b) => (b.kind === "story" ? 2 : "chance" in b ? b.chance : 0) - (a.kind === "story" ? 2 : "chance" in a ? a.chance : 0));
  return map;
}

export const ITEM_SOURCES: Record<string, ItemSource[]> = build();

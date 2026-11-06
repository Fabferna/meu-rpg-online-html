// Balanceamento das armas por raça: dano médio de cada raça × cada tipo de arma nos níveis 5, 15, 25 e 35,
// comparando a fórmula ANTIGA (ATQ fixo) com a NOVA (escala com atributo + nível).
// Uso: npx tsx --conditions=react-server scripts/gear-sim.ts [--md]
import { playerCombatant, resolveTurn, type BattleState, type Combatant, type PlayerAction } from "../src/lib/game/combat";
import { ITEMS, SLOTS, itemStatsFor, type ItemDef } from "../src/lib/game/items";
import { RACES, RACE_IDS, type Attributes, type RaceId } from "../src/lib/game/data";
import { RACE_PROFILE, WEAPON_TYPES, heroStats, type Piece, type WeaponType } from "../src/lib/game/gear";
import { skillsOf, slotsFor, skillUpgradeLevel, SKILL_MAX_LEVEL } from "../src/lib/game/skills";
import { maxHp } from "../src/lib/game/rules";

const LEVELS = [5, 15, 25, 35];
const MD = process.argv.includes("--md");

/** Pontos de um jogador típico da raça: metade no 1º atributo principal, 1/4 no 2º, 1/4 em CON. */
export function typicalAttrs(race: RaceId, level: number): Attributes {
  const a = { ...RACES[race].attributes };
  const pts = (level - 1) * 3;
  const [m1, m2] = RACE_PROFILE[race].main;
  const p1 = Math.round(pts / 2), p2 = Math.round(pts / 4), p3 = pts - p1 - p2;
  a[m1] += p1; a[m2] += p2; a.con += p3;
  return a;
}
/** Antes desta mudança, todo mundo precisava de FOR para bater: o jogador "antigo" punha os pontos de dano em FOR. */
function oldAttrs(race: RaceId, level: number): Attributes {
  const a = typicalAttrs(race, level);
  const [m1] = RACE_PROFILE[race].main;
  if (m1 === "dex") { a.str += a.dex - RACES[race].attributes.dex; a.dex = RACES[race].attributes.dex; }
  return a;
}

/** Melhor arma do tipo disponível no nível (a de menor nível se nenhuma estiver liberada). */
function weaponOf(type: WeaponType, level: number) {
  const list = ITEMS.filter((i) => i.weapon === type).sort((a, b) => (a.minLevel ?? 1) - (b.minLevel ?? 1));
  return list.filter((i) => (i.minLevel ?? 1) <= level).at(-1) ?? null;
}
/** Armadura do nível: melhor peça de cada espaço, preferindo o peso da raça. */
function armorOf(race: RaceId, level: number) {
  return SLOTS.filter((s) => s !== "weapon").map((slot) => ITEMS.filter((i) => i.slot === slot && (i.minLevel ?? 1) <= level)
    .sort((a, b) => Number(b.weight === RACE_PROFILE[race].weight) - Number(a.weight === RACE_PROFILE[race].weight) || (b.minLevel ?? 0) - (a.minLevel ?? 0))[0])
    .filter(Boolean) as ItemDef[];
}
const piece = (d: ItemDef, race: RaceId): Piece => ({ item: d, stats: itemStatsFor(d, d.stats as Record<string, number>, race) as Record<string, number> });

function skillSet(race: RaceId, level: number) {
  const own = skillsOf(race).filter((s) => s.unlock <= level);
  const lv: Record<string, number> = {};
  for (const s of own) { let l = 1; while (l < SKILL_MAX_LEVEL && skillUpgradeLevel(s, l) <= level) l++; lv[s.id] = l; }
  return { lv, eq: own.slice(-slotsFor(level)).map((s) => s.id) };
}

/** Alvo de referência do nível (defesa e agilidade de um inimigo comum). */
const targetHp = (L: number) => 100 + 28 * L;
const target = (L: number): Combatant => ({ name: "alvo", hp: targetHp(L), maxHp: targetHp(L), atk: [0, 0], magic: [0, 0], def: Math.round(1 + 0.9 * L), agility: 10 + Math.round(L / 4) });

/** Dano médio por turno: só ataque básico, e com habilidades (usa a barra sempre que pode). */
function dpt(pc: Combatant, race: RaceId, L: number, withSkills: boolean, turns = 4000) {
  const sk = skillSet(race, L);
  const e = target(L);
  const H = targetHp(L);
  let st: BattleState = { enemyId: "x", enemy: { name: "", image: "", hp: H, maxHp: H }, player: { hp: 1e9, maxHp: 1e9 }, turn: 0, skillCooldown: 0, log: [] };
  let dealt = 0;
  for (let t = 0; t < turns; t++) {
    let a: PlayerAction = "attack";
    if (withSkills) { const i = sk.eq.findIndex((id) => !(st.cds?.[id] ?? 0)); if (i >= 0) a = `s${i}` as PlayerAction; }
    const before = st.enemy.hp;
    st = resolveTurn(st, a, { ...pc, hp: 1e9 }, { ...e, hp: st.enemy.hp }, false, sk, {}).state;
    dealt += before - st.enemy.hp;
    // O alvo "renasce" com a vida cheia a cada turno (mede só o dano); veneno e recargas continuam valendo.
    st.log = []; st.player.hp = 1e9; st.enemy.hp = H;
  }
  return dealt / turns;
}

/** Fórmula ANTIGA de combat.ts (antes desta mudança), copiada aqui só para comparar. */
function oldCombatant(a: Attributes, level: number, hp: number, gear: Record<string, number>[]): Combatant {
  const b = { atk: 0, def: 0, str: 0, dex: 0, con: 0, intel: 0 } as Record<string, number>;
  for (const g of gear) for (const k of Object.keys(b)) b[k] += g[k] ?? 0;
  const str = a.str + b.str, dex = a.dex + b.dex, con = a.con + b.con, intel = a.intel + b.intel;
  return { name: "p", hp, maxHp: hp, atk: [str + level + b.atk, Math.round(str * 1.4 + level * 2) + b.atk], magic: [intel + level, Math.round(intel * 1.7 + level * 2)], def: Math.round(con * 0.5 + b.def), agility: dex };
}

function build(race: RaceId, L: number, w: ItemDef | null, mode: "old" | "oldSame" | "new") {
  const a = mode === "old" ? oldAttrs(race, L) : typicalAttrs(race, L);
  const pieces = [...(w ? [w] : []), ...armorOf(race, L)].map((d) => piece(d, race));
  const hp = maxHp(a, L);
  return mode !== "new" ? oldCombatant(a, L, hp, pieces.map((p) => p.stats)) : playerCombatant("p", a, L, hp, hp, pieces.map((p) => p.stats), race, pieces);
}

const types = Object.keys(WEAPON_TYPES) as WeaponType[];
const out: string[] = [];
const line = (cells: string[]) => out.push(MD ? `| ${cells.join(" | ")} |` : cells.map((c, i) => c.padEnd(i ? 13 : 12)).join(""));

for (const L of LEVELS) {
  out.push(MD ? `\n**Nível ${L}** — dano médio por turno com habilidades (golpe básico entre parênteses); ★ = tipo preferido da raça\n` : `\n=== Nível ${L} (dano/turno com habilidades · golpe básico) ===`);
  line(["Raça", ...types.map((t) => { const w = weaponOf(t, L); return w ? `${WEAPON_TYPES[t].label}` : `${WEAPON_TYPES[t].label} —`; }), "Antes*", "Antes²"]);
  if (MD) line(["---", ...types.map(() => "---:"), "---:", "---:"]);
  for (const race of RACE_IDS) {
    const cells = types.map((t) => {
      const w = weaponOf(t, L);
      if (!w) return "—";
      const pc = build(race, L, w, "new");
      const pref = RACE_PROFILE[race].prefers.includes(t) ? "★" : "";
      return `${pref}${Math.round(dpt(pc, race, L, true))} (${Math.round(dpt(pc, race, L, false))})`;
    });
    // Antes: melhor arma de afinidade/preferida com a fórmula antiga.
    const fav = RACE_PROFILE[race].prefers.map((t) => weaponOf(t, L)).find(Boolean) ?? weaponOf("espada", L);
    const old = build(race, L, fav, "old");
    cells.push(`${Math.round(dpt(old, race, L, true))} (${Math.round(dpt(old, race, L, false))})`);
    const same = build(race, L, fav, "oldSame");
    cells.push(`${Math.round(dpt(same, race, L, true))} (${Math.round(dpt(same, race, L, false))})`);
    line([RACES[race].name.split(" ")[0], ...cells]);
  }
}
out.push(MD
  ? "\n\\* **Antes** = fórmula antiga (ATQ fixo), arma preferida e os pontos de dano em FOR (o único atributo que aumentava o golpe).  \n² **Antes²** = fórmula antiga com os MESMOS pontos das outras colunas (ex.: elfo com DES alta) — é o que o jogador sentia de verdade."
  : "\n* Antes = fórmula antiga, arma preferida e pontos de dano em FOR.  ² Antes² = fórmula antiga com os mesmos pontos (ex.: elfo com DES).");

// Exemplo detalhado do cálculo da arma.
const ex = heroStats(typicalAttrs("elfo", 35), 35, [], "elfo", [piece(ITEMS.find((i) => i.id === "arco_lunar")!, "elfo")]).weapon!;
out.push(`\nExemplo: Elfo nv 35 com Arco Lunar → base ${ex.base} + DES×coef ${ex.fromAttr} + nível ${ex.fromLevel} = ${ex.total} (escala com ${ex.attr.toUpperCase()}).`);
console.log(out.join("\n"));

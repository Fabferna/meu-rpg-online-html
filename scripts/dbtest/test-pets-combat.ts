// Pet em combate: age sozinho no turno (PvE e PvP), com a chance e o efeito de cada espécie.
// Não usa o banco. Uso: npm run test:pets
import { petAct, resolveTurn, simulateDuel, type BattleState, type Combatant } from "../../src/lib/game/combat";
import { PETS, PET_RULES, petChance, petDamageMult, petHealPct } from "../../src/lib/game/pets";

const ok = (c: boolean, m: string) => { console.log(`${c ? "✅" : "❌"} ${m}`); if (!c) process.exitCode = 1; };
const hero = (pet: Combatant["pet"] = null): Combatant => ({ name: "Herói", hp: 300, maxHp: 300, atk: [40, 50], magic: [30, 40], def: 12, agility: 12, maxMp: 60, maxSp: 60, level: 10, pet });
const foe: Combatant = { name: "Lobo", hp: 100000, maxHp: 100000, atk: [30, 40], magic: [30, 40], def: 10, agility: 10 };
const fresh = (hp = 150): BattleState => ({ enemyId: "x", enemy: { name: "Lobo", image: "", hp: 100000, maxHp: 100000 }, player: { hp, maxHp: 300 }, turn: 0, skillCooldown: 0, log: [] });
const loadout = { lv: {}, eq: [] } as never;
const N = 4000;

// Sem pet: nada muda.
let any = false;
for (let i = 0; i < 300; i++) if (resolveTurn(fresh(), "attack", hero(), foe, false, loadout).state.log.some((l) => l.action === "pet")) any = true;
ok(!any && petAct(hero(), foe) === null, "sem pet ativo, nenhuma ação de pet");

for (const def of PETS) {
  for (const level of [1, 5]) {
    let acts = 0, dmg = 0, heal = 0, weak = 0, over = false, bad = false;
    for (let i = 0; i < N; i++) {
      const r = resolveTurn(fresh(), "attack", hero({ id: def.id, level }), foe, false, loadout).state;
      const l = r.log.find((x) => x.action === "pet");
      if (r.player.hp > r.player.maxHp) over = true;
      if (!l) continue;
      acts++; dmg += l.dmg ?? 0; heal += l.heal ?? 0; if (l.effect === "weak") weak++;
      if (l.actor !== "player" || l.petId !== def.id || (!l.dmg && !l.heal)) bad = true;
    }
    const rate = acts / N, want = petChance(level);
    ok(Math.abs(rate - want) < 0.035 && !over && !bad, `${def.name} nv.${level}: agiu em ${(rate * 100).toFixed(1)}% dos turnos (esperado ${(want * 100).toFixed(0)}%), dano médio ${(dmg / Math.max(1, acts)).toFixed(1)}, cura média ${(heal / Math.max(1, acts)).toFixed(1)}`);
    if (def.id === "lobo") ok(dmg > 0 && heal === 0, `  Lobo só causa dano (até ${Math.round(50 * petDamageMult(level))} antes da defesa)`);
    if (def.id === "coruja") ok(dmg > 0 && weak === acts, "  Coruja causa dano mágico e sempre enfraquece");
    if (def.id === "tartaruga") ok(dmg === 0 && Math.round(heal / acts) === Math.round(300 * petHealPct(level) / 100), `  Tartaruga cura ${petHealPct(level)}% da vida máxima`);
    if (def.id === "fenix") ok(dmg > 0 && heal > 0 && heal < dmg, "  Fênix causa dano e cura parte dele");
  }
}

// Cura não passa da vida máxima.
let capped = true;
for (let i = 0; i < 1500; i++) { const r = resolveTurn(fresh(299), "defend", hero({ id: "tartaruga", level: 5 }), { ...foe, atk: [0, 0] }, false, loadout).state; if (r.player.hp > 300) capped = false; }
ok(capped, "a cura do pet nunca passa da vida máxima");

// Enfraquecer reduz o próximo golpe do inimigo.
const avgHit = (pet: Combatant["pet"], onlyWeak: boolean) => {
  let sum = 0, n = 0;
  for (let i = 0; i < N * 2; i++) {
    const r = resolveTurn(fresh(300), "attack", hero(pet), foe, false, loadout).state;
    const w = r.log.some((l) => l.effect === "weak");
    const hit = r.log.find((l) => l.actor === "enemy" && l.action === "attack" && !l.miss);
    if (hit && w === onlyWeak) { sum += (hit.dmg ?? 0) / (hit.crit ? 1.6 : 1); n++; }
  }
  return sum / n;
};
const normal = avgHit(null, false), weakHit = avgHit({ id: "coruja", level: 5 }, true);
ok(Math.abs(weakHit / normal - (1 - PET_RULES.weakPct / 100)) < 0.05, `inimigo enfraquecido bate ${(100 - (weakHit / normal) * 100).toFixed(0)}% mais fraco (esperado ${PET_RULES.weakPct}%)`);

// PvP: os pets dos dois lados agem e a vida final bate com o log.
let petA = 0, petB = 0, consistent = true, winsWith = 0;
const D = 1500;
for (let i = 0; i < D; i++) {
  const a = hero({ id: "lobo", level: 5 }), b = { ...hero({ id: "tartaruga", level: 3 }), name: "Rival" };
  const d = simulateDuel(a, b);
  let hpA = a.maxHp, hpB = b.maxHp;
  for (const l of d.log) {
    if (l.action === "pet") { if (l.side === "a") petA++; else petB++; }
    if (l.side === "a") { hpB = Math.max(0, hpB - (l.dmg ?? 0)); hpA = Math.min(a.maxHp, hpA + (l.heal ?? 0)); }
    else { hpA = Math.max(0, hpA - (l.dmg ?? 0)); hpB = Math.min(b.maxHp, hpB + (l.heal ?? 0)); }
  }
  if (hpA !== d.hpA || hpB !== d.hpB) consistent = false;
  if (simulateDuel(hero({ id: "lobo", level: 5 }), { ...hero(), name: "Rival" }).aWins) winsWith++;
}
ok(petA > 0 && petB > 0, `PvP: os dois pets agem (${petA} e ${petB} ações em ${D} duelos)`);
ok(consistent, "PvP: a vida refeita pelo log (como a tela faz) bate com o resultado do servidor");
ok(winsWith / D > 0.55 && winsWith / D < 0.95, `PvP entre heróis iguais: quem tem Lobo nv.5 vence ${(winsWith / D * 100).toFixed(0)}% contra quem não tem pet`);

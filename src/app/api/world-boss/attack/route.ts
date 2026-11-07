import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { heroCombatant, loadPlayer } from "@/lib/game/player";
import { raidDamage } from "@/lib/game/combat";
import { WORLD_BOSS_RULES, worldBossForDay, worldBossMaxHp, worldBossSchedule, WORLD_BOSS_BY_ID } from "@/lib/game/worldBoss";
import { activeLevels } from "@/lib/game/worldBossServer";

// Ataque ao Chefe do Mundo: só no horário do evento; dano calculado aqui com atributos e equipamentos reais.
export const POST = action("world-boss-attack", z.object({}).strict(), async ({ user, admin }) => {
  const sch = worldBossSchedule();
  if (!sch.open) throw new HttpError(409, "world_boss_closed");
  const p = await loadPlayer(admin, user.id);
  if (!p) throw new HttpError(404, "no_character");

  const { data: existing } = await admin.from("world_bosses").select("boss_id").eq("day", sch.day).maybeSingle();
  const boss = existing ? WORLD_BOSS_BY_ID[existing.boss_id] ?? worldBossForDay(sch.day) : worldBossForDay(sch.day);
  const maxHp = existing ? 1 : worldBossMaxHp(await activeLevels(admin)); // só usado na criação do chefe do dia

  const r = raidDamage(heroCombatant(p, p.maxHp, p.maxHp), boss.def, boss.agility, WORLD_BOSS_RULES.rounds, boss.element);
  const res = await rpc<{ dealt: number; hp: number; defeated: boolean }>(admin, "world_boss_attack", {
    p_user: user.id, p_day: sch.day, p_boss_id: boss.id, p_max_hp: maxHp, p_starts: sch.startsAt, p_ends: sch.endsAt,
    p_damage: r.total, p_limit: WORLD_BOSS_RULES.attacksPerEvent, p_energy: WORLD_BOSS_RULES.energy,
  });
  return { ...res, hits: r.hits };
}, { max: 15, windowSec: 60 });

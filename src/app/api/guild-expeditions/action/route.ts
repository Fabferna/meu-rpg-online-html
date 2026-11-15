import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { EXPEDITION_BY_ID, EXPEDITION_RULES, KIND_LABEL } from "@/lib/game/expeditions";
import { myExpeditionPower, rollExpeditionReward, settleExpedition, strategyOf, type ExpeditionMemberRow, type ExpeditionRow } from "@/lib/game/expeditionServer";
import { BAG_LIMIT } from "@/lib/game/loot";

const Schema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start"), expedition: z.string().max(40), strategy: z.enum(["cautious", "balanced", "bold"]).default("balanced"), solo: z.boolean().default(false) }).strict(),
  z.object({ type: z.literal("join"), id: z.uuid() }).strict(),
  z.object({ type: z.literal("leave"), id: z.uuid() }).strict(),
  z.object({ type: z.literal("cancel"), id: z.uuid() }).strict(),
  z.object({ type: z.literal("depart"), id: z.uuid() }).strict(),
  z.object({ type: z.literal("claim"), id: z.uuid() }).strict(),
]);

export const POST = action("guild-expedition", Schema, async ({ user, body, admin }) => {
  switch (body.type) {
    case "start": {
      const def = EXPEDITION_BY_ID[body.expedition];
      if (!def) throw new HttpError(404, "unknown_expedition");
      const me = await myExpeditionPower(admin, user.id);
      if (!me) throw new HttpError(404, "no_character");
      // Custo, duração e limites vêm SEMPRE do catálogo do servidor; o cliente só escolhe qual e como.
      const id = await rpc<string>(admin, "guild_expedition_start", {
        p_user: user.id, p_expedition: def.id, p_strategy: body.strategy, p_cost: def.cost, p_minutes: def.minutes, p_min_level: def.guildLevel,
        p_max_party: body.solo ? 1 : def.party, p_lobby_sec: body.solo ? 0 : EXPEDITION_RULES.lobbySec, p_max_active: EXPEDITION_RULES.maxActive, p_power: me.power,
        p_announce: `🧭 Abri a ${KIND_LABEL[def.kind].toLowerCase()} "${def.name}"! Entrem pela aba Expedições: partimos em ${Math.round(EXPEDITION_RULES.lobbySec / 60)} minutos.`,
      });
      return { id };
    }
    case "join": {
      const me = await myExpeditionPower(admin, user.id);
      if (!me) throw new HttpError(404, "no_character");
      return rpc(admin, "guild_expedition_join", { p_user: user.id, p_id: body.id, p_power: me.power });
    }
    case "leave":
      return rpc(admin, "guild_expedition_leave", { p_user: user.id, p_id: body.id });
    case "cancel":
      return rpc(admin, "guild_expedition_cancel", { p_user: user.id, p_id: body.id });
    case "depart":
      return rpc(admin, "guild_expedition_depart", { p_user: user.id, p_id: body.id });
    case "claim": {
      const [{ data: row }, { data: ms }] = await Promise.all([
        admin.from("guild_expeditions").select("*").eq("id", body.id).maybeSingle(),
        admin.from("guild_expedition_members").select("*").eq("expedition_id", body.id),
      ]);
      const e = row as ExpeditionRow | null;
      const members = (ms ?? []) as ExpeditionMemberRow[];
      const mine = members.find((m) => m.user_id === user.id);
      const def = e ? EXPEDITION_BY_ID[e.expedition] : undefined;
      if (!e || !def) throw new HttpError(409, "expedition_gone");
      if (!mine) throw new HttpError(409, "not_on_expedition");
      if (mine.claimed_at) throw new HttpError(409, "already_claimed");
      // Se ninguém abriu a tela desde a volta, o resultado é sorteado agora.
      const outcome = e.status === "done" ? e.outcome : e.status === "active" && Date.parse(e.ends_at) <= Date.now() ? await settleExpedition(admin, e, members) : null;
      if (!outcome) throw new HttpError(409, "expedition_running");
      const r = rollExpeditionReward(def, outcome, strategyOf(e.strategy), mine.race);
      const reward = await rpc(admin, "guild_expedition_claim", { p_user: user.id, p_id: e.id, p_xp: r.xp, p_gold: r.gold, p_items: r.items, p_bag_limit: BAG_LIMIT });
      return { outcome, reward };
    }
  }
}, { max: 30, windowSec: 60 });

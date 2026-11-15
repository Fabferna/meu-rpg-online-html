import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/security/http";
import { ROLE_RANK, isGuildRole } from "@/lib/game/guilds";
import { EXPEDITION_BY_ID, EXPEDITION_RULES } from "@/lib/game/expeditions";
import { myExpeditionPower, settleExpedition, type ExpeditionMemberRow, type ExpeditionRow } from "@/lib/game/expeditionServer";
import { ITEM_BY_ID } from "@/lib/game/items";

export const dynamic = "force-dynamic";

/** Expedições da guilda do jogador: em andamento, prontas para resgatar e histórico. */
export async function GET() {
  const { user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  const admin = createAdminClient();
  const { data: me } = await admin.from("guild_members").select("guild_id, role").eq("user_id", user.id).maybeSingle();
  if (!me) return NextResponse.json({ guild: false }, { headers: { "Cache-Control": "no-store" } });

  const load = async () => {
    const { data: rows, error } = await admin.from("guild_expeditions").select("*").eq("guild_id", me.guild_id).order("created_at", { ascending: false }).limit(40);
    if (error) return null;
    const list = (rows ?? []) as ExpeditionRow[];
    const { data: ms } = list.length ? await admin.from("guild_expedition_members").select("*").in("expedition_id", list.map((r) => r.id)) : { data: [] };
    return { list, members: (ms ?? []) as ExpeditionMemberRow[] };
  };
  let d = await load();
  // Migração 0046 ainda não aplicada: a aba simplesmente avisa que não está disponível.
  if (!d) return jsonError(503, "unavailable");

  // Quem voltou e ainda não teve o resultado sorteado é fechado agora (qualquer membro que abrir a tela dispara).
  const due = d.list.filter((r) => r.status === "active" && Date.parse(r.ends_at) <= Date.now());
  if (due.length) {
    for (const r of due) await settleExpedition(admin, r, d.members.filter((m) => m.expedition_id === r.id)).catch(() => null);
    d = (await load()) ?? d;
  }

  const [{ data: g }, mine] = await Promise.all([
    admin.from("guilds").select("level, treasury").eq("id", me.guild_id).single(),
    myExpeditionPower(admin, user.id),
  ]);
  const now = Date.now();
  const view = (r: ExpeditionRow) => {
    const members = d!.members.filter((m) => m.expedition_id === r.id).sort((a, b) => a.joined_at.localeCompare(b.joined_at));
    const mineRow = members.find((m) => m.user_id === user.id);
    const phase = r.status === "cancelled" ? "cancelled" : r.status === "done" ? "done" : now < Date.parse(r.departs_at) ? "lobby" : "running";
    return {
      id: r.id, key: r.expedition, strategy: r.strategy, phase, cost: r.cost,
      createdAt: r.created_at, departsAt: r.departs_at, endsAt: r.ends_at,
      organizer: members.find((m) => m.user_id === r.created_by)?.name ?? null, mine: r.created_by === user.id,
      joined: !!mineRow, claimed: !!mineRow?.claimed_at,
      reward: mineRow?.reward ? { ...mineRow.reward, items: mineRow.reward.items.map((i) => ({ ...i, name: ITEM_BY_ID[i.item]?.name ?? i.item, image: ITEM_BY_ID[i.item]?.image ?? "", rarity: ITEM_BY_ID[i.item]?.rarity ?? "common" })) } : null,
      outcome: r.outcome, power: r.power, report: r.report ?? [],
      members: members.map((m) => ({ name: m.name, race: m.race, level: m.level, power: m.power, me: m.user_id === user.id, claimed: !!m.claimed_at })),
    };
  };
  const known = d.list.filter((r) => EXPEDITION_BY_ID[r.expedition]);
  const open = known.filter((r) => r.status === "active").map(view);
  // Prontas: voltaram e eu ainda não resgatei.
  const ready = known.filter((r) => r.status === "done").map(view).filter((v) => v.joined && !v.claimed);
  const history = known.filter((r) => r.status !== "active").map(view).filter((v) => !(v.joined && !v.claimed)).slice(0, EXPEDITION_RULES.history);
  const role = isGuildRole(me.role) ? me.role : "member";

  return NextResponse.json({
    guild: true, level: g?.level ?? 1, treasury: Number(g?.treasury ?? 0), canOrganize: ROLE_RANK[role] >= 1,
    myPower: mine?.power ?? 0, myRace: mine?.race ?? null,
    busy: open.some((v) => v.joined), activeCount: open.length,
    open, ready, history, serverTime: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}

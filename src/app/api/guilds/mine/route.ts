import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/security/http";
import { RACES, type Gender, type RaceId } from "@/lib/game/data";
import { COSMETIC_BY_ID } from "@/lib/shop/catalog";
import { GUILD, ROLE_RANK, guildPerks, guildPerms, isGuildRole, vaultFee, type GuildRole } from "@/lib/game/guilds";
import { ITEM_BY_ID, sellPrice } from "@/lib/game/items";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  const admin = createAdminClient();
  const { data: me } = await admin.from("guild_members").select("guild_id, role").eq("user_id", user.id).maybeSingle();
  if (!me) return NextResponse.json({ guild: null }, { headers: { "Cache-Control": "no-store" } });

  const myRole: GuildRole = isGuildRole(me.role) ? me.role : "member";
  const perms = guildPerms(myRole);
  const [{ data: g }, { data: members }, { data: vault }, { data: log }] = await Promise.all([
    admin.from("guilds").select("*").eq("id", me.guild_id).single(),
    admin.from("guild_members").select("user_id, role, contributed, joined_at").eq("guild_id", me.guild_id),
    admin.from("guild_inventory").select("id, item_id, qty, upgrade, deposited_at, items(name, kind, rarity, data)").eq("guild_id", me.guild_id).order("deposited_at"),
    admin.from("guild_vault_log").select("id, name, action, item_id, qty, upgrade, fee, created_at").eq("guild_id", me.guild_id).order("id", { ascending: false }).limit(30),
  ]);
  const { data: reqs } = perms.requests
    ? await admin.from("guild_requests").select("user_id, message, created_at").eq("guild_id", me.guild_id).order("created_at").limit(50)
    : { data: [] };
  const ids = [...(members ?? []).map((m) => m.user_id), ...(reqs ?? []).map((r) => r.user_id)];
  const { data: chars } = await admin.from("characters").select("user_id, name, level, race, gender, equipped_frame, equipped_skin, updated_at").in("user_id", ids);
  const byId = new Map((chars ?? []).map((c) => [c.user_id, c]));
  const roleOf = (r: string): GuildRole => (isGuildRole(r) ? r : "member");
  const mine = (members ?? []).find((m) => m.user_id === user.id);
  const perks = guildPerks(g.level);
  // Membro novo espera um tempo antes de poder retirar do cofre (cargos de comando não esperam).
  const unlockAt = myRole === "member" && mine ? new Date(mine.joined_at).getTime() + GUILD.vaultMinHours * 3600_000 : 0;
  const itemName = (id: string) => ITEM_BY_ID[id]?.name ?? id;

  return NextResponse.json({
    guild: {
      id: g.id, name: g.name, tag: g.tag, description: g.description, level: g.level, xp: Number(g.xp),
      treasury: Number(g.treasury), limit: g.member_limit, myRole, private: g.privacy === "private",
      perms, perks, nextPerks: g.level < GUILD.maxLevel ? guildPerks(g.level + 1) : null,
      vault: {
        slots: perks.vaultSlots,
        lockedUntil: unlockAt > Date.now() ? new Date(unlockAt).toISOString() : null,
        items: ((vault ?? []) as unknown as {
          id: string; item_id: string; qty: number; upgrade: number;
          items: { name: string; kind: string; rarity: string; data: Record<string, number | string> } | null;
        }[]).map((v) => {
          const def = ITEM_BY_ID[v.item_id];
          return {
            id: v.id, itemId: v.item_id, qty: v.qty, upgrade: v.upgrade ?? 0,
            name: v.items?.name ?? itemName(v.item_id), kind: v.items?.kind ?? "", rarity: v.items?.rarity ?? "common",
            image: String(v.items?.data?.image ?? def?.image ?? ""), slot: v.items?.data?.slot ? String(v.items.data.slot) : null,
            // Taxa por unidade para o cargo de quem está olhando.
            fee: vaultFee(def ? sellPrice(def, v.upgrade ?? 0) : 0, 1, myRole),
          };
        }),
        log: (log ?? []).map((l) => ({ id: l.id, name: l.name, action: l.action, item: itemName(l.item_id), qty: l.qty, upgrade: l.upgrade, fee: l.fee, at: l.created_at })),
      },
      requests: (reqs ?? []).flatMap((r) => {
        const c = byId.get(r.user_id);
        if (!c) return [];
        return [{
          name: c.name, level: c.level, message: r.message, at: r.created_at, frame: c.equipped_frame ?? null,
          portrait: (c.equipped_skin && COSMETIC_BY_ID[c.equipped_skin]?.image) || RACES[c.race as RaceId].portraits[c.gender as Gender],
        }];
      }),
      members: (members ?? [])
        .map((m) => {
          const c = byId.get(m.user_id);
          return {
            name: c?.name ?? "?", level: c?.level ?? 1, role: roleOf(m.role), contributed: Number(m.contributed), me: m.user_id === user.id,
            portrait: (c?.equipped_skin && COSMETIC_BY_ID[c.equipped_skin]?.image) || (c ? RACES[c.race as RaceId].portraits[c.gender as Gender] : ""),
            frame: c?.equipped_frame ?? null,
            active: c ? Date.now() - new Date(c.updated_at).getTime() < 24 * 3600_000 : false,
          };
        })
        .sort((a, b) => ROLE_RANK[b.role] - ROLE_RANK[a.role] || b.contributed - a.contributed),
    },
  }, { headers: { "Cache-Control": "no-store" } });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/security/http";
import { baseAttributes, DELETE_COST, maxEnergy, maxHp, RESET_COST } from "@/lib/game/rules";
import type { RaceId } from "@/lib/game/data";

export const dynamic = "force-dynamic";

// GET: quanto custa resetar/excluir agora.
export async function GET() {
  const { user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  const { data } = await createAdminClient().from("profiles").select("resets_used, deletes_used").eq("id", user.id).maybeSingle();
  return NextResponse.json({
    resetCost: (data?.resets_used ?? 0) > 0 ? RESET_COST : 0,
    deleteCost: (data?.deletes_used ?? 0) > 0 ? DELETE_COST : 0,
  }, { headers: { "Cache-Control": "no-store" } });
}

// POST: resetar (volta ao nível 1 com o mesmo nome/raça) ou excluir (cria outro herói depois).
// O jogador confirma digitando o nome do herói.
const Schema = z.object({ mode: z.enum(["reset", "delete"]), confirm: z.string().max(16) }).strict();

export const POST = action("character-manage", Schema, async ({ user, body, admin }) => {
  const { data: c } = await admin.from("characters").select("name, race, region, gender").eq("user_id", user.id).single();
  if (!c) throw new HttpError(404, "no_character");
  if (body.confirm.trim().toLowerCase() !== String(c.name).toLowerCase()) throw new HttpError(400, "confirm_name");

  await rpc(admin, "wipe_character", { p_user: user.id, p_mode: body.mode, p_cost: body.mode === "reset" ? RESET_COST : DELETE_COST });

  if (body.mode === "reset") {
    const a = baseAttributes(c.race as RaceId);
    await rpc(admin, "create_character", {
      p_user: user.id, p_name: c.name, p_race: c.race, p_region: c.region, p_gender: c.gender,
      p_str: a.str, p_dex: a.dex, p_con: a.con, p_int: a.intel, p_wis: a.wis, p_cha: a.cha,
      p_hp: maxHp(a, 1), p_energy: maxEnergy(a, 1), p_starting_gold: 0,
    });
  }
  return { ok: true, mode: body.mode };
}, { max: 3, windowSec: 60 });

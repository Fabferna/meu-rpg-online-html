import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GENDERS, RACE_IDS, REGION_IDS } from "@/lib/game/data";
import { baseAttributes, maxEnergy, maxHp, STARTING_GOLD } from "@/lib/game/rules";
import { getPlayerState } from "@/lib/game/state";
import { rateLimit } from "@/lib/security/rateLimit";
import { isSameOrigin, jsonError } from "@/lib/security/http";

export const dynamic = "force-dynamic";

// GET /api/character → estado atual (energia já recalculada pelo servidor)
export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");
  const state = await getPlayerState(supabase, user.id);
  if (!state) return jsonError(404, "no_character");
  return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
}

// O cliente escolhe APENAS nome/raça/região/gênero.
// Atributos, HP, energia e ouro são definidos aqui, no servidor.
const CreateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3)
      .max(16)
      .regex(/^[A-Za-zÀ-ÿ0-9_]+$/, "Use apenas letras, números e _"),
    race: z.enum(RACE_IDS),
    region: z.enum(REGION_IDS),
    gender: z.enum(GENDERS),
  })
  .strict(); // rejeita campos extras (ex.: alguém tentando mandar "gold": 99999)

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "bad_origin");

  const { user } = await getUser();
  if (!user) return jsonError(401, "unauthorized");

  if (!(await rateLimit(`create-char:${user.id}`, 5, 60))) return jsonError(429, "too_many_requests");

  const body = await request.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { name, race, region, gender } = parsed.data;
  const a = baseAttributes(race);

  const admin = createAdminClient();
  const { error } = await admin.rpc("create_character", {
    p_user: user.id,
    p_name: name,
    p_race: race,
    p_region: region,
    p_gender: gender,
    p_str: a.str,
    p_dex: a.dex,
    p_con: a.con,
    p_int: a.intel,
    p_wis: a.wis,
    p_cha: a.cha,
    p_hp: maxHp(a, 1),
    p_energy: maxEnergy(a, 1),
    p_starting_gold: STARTING_GOLD,
  } as never);

  if (error) {
    if (error.code === "23505") {
      const msg = error.message.includes("user_id") ? "already_has_character" : "name_taken";
      return jsonError(409, msg);
    }
    console.error("create_character failed", error);
    return jsonError(500, "internal_error");
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

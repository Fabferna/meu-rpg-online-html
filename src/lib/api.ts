import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import type { User } from "@supabase/supabase-js";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/security/rateLimit";
import { isSameOrigin, jsonError } from "@/lib/security/http";

type Ctx<T> = { user: User; body: T; admin: ReturnType<typeof createAdminClient> };

// Mensagens de erro de negócio lançadas pelas funções SQL → HTTP 4xx.
const BUSINESS_ERRORS = new Set([
  "not_enough_energy", "quest_already_running", "quest_not_finished", "no_quest", "in_battle",
  "not_enough_points", "invalid_points", "not_owner", "not_equippable", "no_character",
  "insufficient_funds", "energy_full", "already_owned", "daily_limit", "sold_out", "offer_expired",
  "already_claimed", "quest_already_done", "unknown_offer", "item_equipped",
  "already_in_guild", "guild_name_taken", "unknown_guild", "guild_full", "not_in_guild", "no_permission", "invalid_target", "boss_defeated", "muted",
]);

/**
 * Wrapper para TODA rota que altera estado do jogo:
 * Origin (CSRF) → sessão válida → rate limit → validação Zod → handler.
 */
export function action<S extends z.ZodType>(
  name: string,
  schema: S,
  handler: (ctx: Ctx<z.infer<S>>) => Promise<unknown>,
  limit = { max: 30, windowSec: 60 },
) {
  return async (request: Request) => {
    if (!isSameOrigin(request)) return jsonError(403, "bad_origin");
    const { user } = await getUser();
    if (!user) return jsonError(401, "unauthorized");
    if (!(await rateLimit(`${name}:${user.id}`, limit.max, limit.windowSec))) return jsonError(429, "too_many_requests");

    const raw = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return jsonError(400, "invalid_input");

    try {
      const result = await handler({ user, body: parsed.data, admin: createAdminClient() });
      return NextResponse.json(result ?? { ok: true }, { headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : "";
      const code = [...BUSINESS_ERRORS].find((c) => msg.includes(c));
      if (code) return jsonError(409, code);
      if (err instanceof HttpError) return jsonError(err.status, err.code);
      console.error(`[${name}]`, err);
      return jsonError(500, "internal_error");
    }
  };
}

export class HttpError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

/** Executa uma RPC e lança se der erro. */
export async function rpc<T = unknown>(admin: ReturnType<typeof createAdminClient>, fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await admin.rpc(fn, args as never);
  if (error) throw new Error(error.message);
  return data as T;
}

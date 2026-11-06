import "server-only";
import { HttpError } from "@/lib/api";
import type { createAdminClient } from "@/lib/supabase/admin";
import { BAG_LIMIT } from "./loot";

type Admin = ReturnType<typeof createAdminClient>;

/** Espaços ocupados na bolsa (itens não equipados; pilha = 1 espaço). */
export async function bagUsed(admin: Admin, userId: string) {
  const { count } = await admin.from("inventory").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("equipped", false);
  return count ?? 0;
}

/** Compra de equipamento com a bolsa cheia é recusada ANTES de cobrar. */
export async function assertBagSpace(admin: Admin, userId: string, slots = 1) {
  if ((await bagUsed(admin, userId)) + slots > BAG_LIMIT) throw new HttpError(409, "bag_full");
}

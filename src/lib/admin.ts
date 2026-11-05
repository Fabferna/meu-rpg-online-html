import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function isAdmin(userId: string) {
  const { data } = await createAdminClient().from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  return !!data?.is_admin;
}

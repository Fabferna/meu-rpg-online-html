import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente com service_role: ignora RLS. Só pode existir no servidor —
// o import "server-only" quebra o build se alguém importar no frontend.
let admin: ReturnType<typeof createClient> | null = null;

export function createAdminClient() {
  if (!admin) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente");
    admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

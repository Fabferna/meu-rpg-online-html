// Substitui @/lib/supabase/admin nos testes: o "service_role" fala direto com o Postgres local.
import { fakeAdmin } from "../fakeSupabase";
const a = fakeAdmin();
export function createAdminClient() { return a as never; }

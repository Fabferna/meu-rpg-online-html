// Substitui @/lib/supabase/server nos testes: o usuário "logado" vem de globalThis.__TEST_USER__.
import { fakeAdmin } from "../fakeSupabase";
export async function getUser() {
  const id = (globalThis as { __TEST_USER__?: string }).__TEST_USER__;
  return { supabase: fakeAdmin() as never, user: id ? ({ id } as never) : null };
}
export async function createClient() { return fakeAdmin() as never; }

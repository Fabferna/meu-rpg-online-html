"use client";
import { createBrowserClient } from "@supabase/ssr";

// Cliente do navegador: usa só a chave pública. Serve para Auth e
// leituras protegidas por RLS. NUNCA consegue gravar estado do jogo.
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

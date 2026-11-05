import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { activeEvents, type GameEvent } from "@/lib/game/events";

export const revalidate = 60;

// Público: eventos ativos agora (mostrados na página inicial e no jogo).
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ events: [] });
  const { data } = await createClient(url, key, { auth: { persistSession: false } }).from("game_events").select("*");
  return NextResponse.json({ events: activeEvents((data ?? []) as GameEvent[]) });
}

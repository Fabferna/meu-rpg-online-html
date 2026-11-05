import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getPlayerState } from "@/lib/game/state";
import GameHud from "@/components/GameHud";

export const dynamic = "force-dynamic";
export const metadata = { title: "Jogo — Aethelgard Online" };

export default async function JogoPage() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login?next=/jogo");
  const state = await getPlayerState(supabase, user.id);
  if (!state) redirect("/criar-personagem");
  return <GameHud initial={state} />;
}

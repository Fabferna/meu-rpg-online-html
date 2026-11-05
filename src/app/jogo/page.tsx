import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getPlayerState } from "@/lib/game/state";
import GameApp from "@/components/game/GameApp";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Jogo")} — Aethelgard Online` };
}

export default async function JogoPage() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login?next=/jogo");
  const state = await getPlayerState(supabase, user.id);
  if (!state) redirect("/criar-personagem");
  return <GameApp initial={state} />;
}

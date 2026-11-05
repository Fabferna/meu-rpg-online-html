import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import CharacterCreator from "./CharacterCreator";

export const metadata = { title: "Criar Herói — Aethelgard Online" };

export default async function Page() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login?next=/criar-personagem");
  const { data } = await supabase.from("characters").select("id").eq("user_id", user.id).maybeSingle();
  if (data) redirect("/jogo");
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-center font-display text-3xl text-gold">Forje seu Herói</h1>
      <CharacterCreator />
    </main>
  );
}

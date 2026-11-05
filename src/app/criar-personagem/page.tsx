import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import CharacterCreator from "./CharacterCreator";
import HeroList from "@/components/game/HeroList";
import { getT } from "@/lib/i18n/server";
import { LanguageSwitcher } from "@/lib/i18n/client";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Criar Herói")} — Aethelgard Online` };
}

export default async function Page() {
  const t = await getT();
  const { supabase, user } = await getUser();
  if (!user) redirect("/login?next=/criar-personagem");
  const { data } = await supabase.from("characters").select("id").eq("user_id", user.id).maybeSingle();
  if (data) redirect("/jogo");
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-4 flex justify-end"><LanguageSwitcher /></div>
      <h1 className="text-center font-display text-3xl text-gold">{t("Forje seu Herói")}</h1>
      <div className="mt-6"><HeroList /></div>
      <CharacterCreator />
    </main>
  );
}

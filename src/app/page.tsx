import Link from "next/link";
import Image from "next/image";
import { RACES } from "@/lib/game/data";

export default function Home() {
  return (
    <main>
      <section className="relative isolate overflow-hidden">
        <Image src="/assets/paisagem_epica_de_aethelgard.png" alt="" fill priority className="-z-10 object-cover opacity-40" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-ink/60 to-ink" />
        <div className="mx-auto max-w-5xl px-4 py-28 text-center fade-up">
          <h1 className="font-display text-4xl font-black tracking-wide text-gold sm:text-6xl">Aethelgard Online</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/80">
            Crie seu herói, cumpra missões, enfrente outros jogadores e escreva sua lenda num mundo de magia e aço.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/login?modo=registro" className="btn-gold">Começar a Jornada</Link>
            <Link href="/login" className="rounded-[10px] border border-white/20 px-5 py-3 font-display hover:bg-white/5">Entrar</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-24">
        <h2 className="mb-6 text-center font-display text-2xl text-gold">Escolha sua linhagem</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {Object.entries(RACES).map(([id, r]) => (
            <div key={id} className="panel overflow-hidden text-center transition hover:-translate-y-1">
              <div className="relative aspect-[3/4]">
                <Image src={r.image} alt={r.name} fill sizes="200px" className="object-cover" />
              </div>
              <p className="p-3 font-display text-sm">{r.name}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

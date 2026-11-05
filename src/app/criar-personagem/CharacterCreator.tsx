"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { GENDERS, RACES, REGIONS, type Gender, type RaceId, type RegionId } from "@/lib/game/data";

const ATTR_LABEL = { str: "FOR", dex: "DES", con: "CON", intel: "INT", wis: "SAB", cha: "CAR" } as const;

export default function CharacterCreator() {
  const router = useRouter();
  const [region, setRegion] = useState<RegionId | null>(null);
  const [race, setRace] = useState<RaceId | null>(null);
  const [gender, setGender] = useState<Gender>("male");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = region && race && /^[A-Za-zÀ-ÿ0-9_]{3,16}$/.test(name);

  async function submit() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/character", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, race, region, gender }),
    });
    if (res.ok) {
      router.replace("/jogo");
      router.refresh();
      return;
    }
    const body = await res.json().catch(() => ({}));
    setError(
      ({ name_taken: "Esse nome já pertence a outro herói.", already_has_character: "Você já possui um herói.", too_many_requests: "Muitas tentativas, aguarde." } as Record<string, string>)[body.error] ??
        "Não foi possível criar o herói.",
    );
    setBusy(false);
  }

  return (
    <div className="mt-8 space-y-10">
      <Step n={1} title="Região de origem">
        <div className="grid gap-4 sm:grid-cols-3">
          {Object.entries(REGIONS).map(([id, r]) => (
            <Card key={id} selected={region === id} onClick={() => setRegion(id as RegionId)} image={r.image} title={r.name} text={r.description} />
          ))}
        </div>
      </Step>

      <Step n={2} title="Raça">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {Object.entries(RACES).map(([id, r]) => (
            <Card key={id} selected={race === id} onClick={() => setRace(id as RaceId)} image={r.image} title={r.name} tall />
          ))}
        </div>
      </Step>

      {race && (
        <Step n={3} title="Aparência e nome">
          <div className="panel grid gap-6 p-6 sm:grid-cols-[220px_1fr]">
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
              <Image src={RACES[race].portraits[gender]} alt="" fill sizes="220px" className="object-cover" />
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                {GENDERS.map((g) => (
                  <button key={g} onClick={() => setGender(g)} className={`rounded-md px-4 py-2 text-sm ${gender === g ? "bg-gold text-ink" : "bg-white/5"}`}>
                    {g === "male" ? "Masculino" : "Feminino"}
                  </button>
                ))}
              </div>
              <p className="text-sm text-white/70">{RACES[race].description}</p>
              <p className="text-sm text-gold">{RACES[race].bonus}</p>
              <div className="grid grid-cols-6 gap-2 text-center">
                {Object.entries(RACES[race].attributes).map(([k, v]) => (
                  <div key={k} className="rounded-md bg-black/40 py-2">
                    <div className="text-[10px] text-white/50">{ATTR_LABEL[k as keyof typeof ATTR_LABEL]}</div>
                    <div className="font-display text-lg">{v}</div>
                  </div>
                ))}
              </div>
              <label className="block text-sm">
                <span className="mb-1 block text-white/70">Nome do herói (3–16, letras/números/_)</span>
                <input className="input" maxLength={16} value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
              <button className="btn-gold w-full" disabled={!ready || busy} onClick={submit}>
                {busy ? "Forjando…" : "Iniciar Jornada"}
              </button>
            </div>
          </div>
        </Step>
      )}
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="fade-up">
      <h2 className="mb-4 font-display text-xl"><span className="mr-2 text-gold">{n}.</span>{title}</h2>
      {children}
    </section>
  );
}

function Card(props: { selected: boolean; onClick: () => void; image: string; title: string; text?: string; tall?: boolean }) {
  return (
    <button
      onClick={props.onClick}
      className={`panel overflow-hidden text-left transition hover:-translate-y-1 ${props.selected ? "ring-2 ring-gold" : ""}`}
    >
      <div className={`relative ${props.tall ? "aspect-[3/4]" : "aspect-video"}`}>
        <Image src={props.image} alt="" fill sizes="300px" className="object-cover" />
      </div>
      <div className="p-3">
        <p className="font-display text-sm">{props.title}</p>
        {props.text && <p className="mt-1 text-xs text-white/60">{props.text}</p>}
      </div>
    </button>
  );
}

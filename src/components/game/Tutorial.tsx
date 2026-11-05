"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";

// Preferência local do navegador (só conveniência; nada de jogo aqui).
const KEY = "aethelgard:tutorial-done";

const STEPS = [
  { icon: "/assets/paisagem_epica_de_aethelgard.webp", title: "Bem-vindo a Aethelgard!", text: "Seu herói acabou de chegar. Aqui você evolui completando missões, caçando monstros e enfrentando outros jogadores." },
  { icon: "/assets/shop/potion_energy.webp", title: "⚡ Energia", text: "Missões, caçadas e duelos gastam energia. Ela volta sozinha: 1 ponto a cada 3 minutos, mesmo com o jogo fechado." },
  { icon: "/assets/as_ruinas_sussurrantes.webp", title: "📜 Missões", text: "Escolha uma missão e espere o cronômetro. Quando terminar, volte e receba XP, ouro e talvez um item raro. Comece pela Patrulha em Valerion!" },
  { icon: "/assets/enemies/sombra_fraca.webp", title: "⚔️ Caçada", text: "Lutas por turnos: Atacar, Habilidade (forte, mas recarrega), Defender ou Poção. Se a vida estiver baixa, descanse ou use uma poção." },
  { icon: "/assets/shop/frame_arcano.webp", title: "🏆 Arena e evolução", text: "A cada nível você ganha 3 pontos de atributo. Desafie heróis na Arena para subir no ranking e não esqueça a recompensa diária na Loja." },
];

export default function Tutorial({ name, onNavigate, onDone }: { name: string; onNavigate: (tab: "quests") => void; onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
      else onDone?.();
    } catch {
      onDone?.(); /* armazenamento bloqueado: não mostra */
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function finish(goQuests: boolean) {
    try { localStorage.setItem(KEY, "1"); } catch { /* ignora */ }
    setOpen(false);
    onDone?.();
    if (goQuests) onNavigate("quests");
  }

  const s = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div key={i} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="panel w-full max-w-md overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="tut-title">
            <div className="relative h-40 bg-black/40">
              <Image src={s.icon} alt="" fill sizes="448px" className="object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-panel to-transparent" />
            </div>
            <div className="p-6">
              <p className="text-xs text-white/50">Passo {i + 1} de {STEPS.length}</p>
              <h2 id="tut-title" className="mt-1 font-display text-2xl text-gold">{i === 0 ? `Bem-vindo, ${name}!` : s.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/80">{s.text}</p>
              <div className="mt-5 flex gap-1.5">
                {STEPS.map((_, k) => <span key={k} className={`h-1.5 flex-1 rounded-full ${k <= i ? "bg-gold" : "bg-white/10"}`} />)}
              </div>
              <div className="mt-6 flex items-center justify-between gap-3">
                <button className="text-sm text-white/50 hover:text-white" onClick={() => finish(false)}>Pular</button>
                <div className="flex gap-2">
                  {i > 0 && <button className="rounded-lg bg-white/10 px-4 py-2 text-sm" onClick={() => setI(i - 1)}>Voltar</button>}
                  <button className="btn-gold" onClick={() => (last ? finish(true) : setI(i + 1))}>{last ? "Ir para Missões" : "Próximo"}</button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

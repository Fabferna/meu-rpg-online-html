"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import type { GameCtx } from "./GameApp";
import { expeditionPower,
  EXPEDITIONS, EXPEDITION_BY_ID, EXPEDITION_RELICS, EXPEDITION_RULES, KIND_ICON, KIND_LABEL, OUTCOME_LABEL, STRATEGIES,
  expeditionOdds, expeditionPayout, gearPool, partyPower, type Expedition, type ExpeditionKind, type Outcome, type Strategy,
} from "@/lib/game/expeditions";
import { RACES, type RaceId } from "@/lib/game/data";
import { ITEM_BY_ID } from "@/lib/game/items";
import { fmtTime, post, RARITY_STYLE } from "./api";
import { Panel } from "./ui";
import { play } from "./sfx";
import { useT } from "@/lib/i18n/client";

type Member = { name: string; race: string; level: number; power: number; me: boolean; claimed: boolean };
type RewardItem = { item: string; qty: number; sold?: number; name: string; image: string; rarity: string };
type Reward = { xp: number; gold: number; levelUps: number; items: RewardItem[] };
type Run = {
  id: string; key: string; strategy: Strategy; phase: "lobby" | "running" | "done" | "cancelled"; cost: number;
  createdAt: string; departsAt: string; endsAt: string; organizer: string | null; mine: boolean; joined: boolean; claimed: boolean;
  reward: Reward | null; outcome: Outcome | null; power: number | null; report: string[]; members: Member[];
};
type Data = {
  guild: boolean; level: number; treasury: number; canOrganize: boolean; myPower: number; myRace: string | null;
  busy: boolean; activeCount: number; open: Run[]; ready: Run[]; history: Run[]; serverTime: string;
};

const OUTCOME_STYLE: Record<Outcome, string> = { triumph: "text-amber-300", success: "text-emerald-300", fail: "text-red-300" };
const OUTCOME_ICON: Record<Outcome, string> = { triumph: "🏆", success: "✅", fail: "💀" };
const pct = (n: number) => `${Math.round(n * 100)}%`;
const raceName = (r: string) => RACES[r as RaceId]?.name ?? r;
const duration = (min: number) => (min < 60 ? `${min} min` : min % 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}` : `${min / 60}h`);

/** Expedições da Guilda: gastar o ouro do tesouro em caçadas, missões e incursões feitas em grupo. */
export default function GuildExpeditions({ ctx }: { ctx: GameCtx }) {
  const t = useT();
  const [d, setD] = useState<Data | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);
  const [won, setWon] = useState<{ run: Run; outcome: Outcome; reward: Reward } | null>(null);
  const skew = useRef(0);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/guild-expeditions", { cache: "no-store" });
      if (!r.ok) { setD((cur) => cur ?? null); return; }
      const j = (await r.json()) as Data;
      skew.current = Date.parse(j.serverTime) - Date.now();
      setD(j);
    } catch { setD((cur) => cur ?? null); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const now = () => Date.now() + skew.current;
  const lobbyOpen = !!d?.open.some((r) => r.phase === "lobby");
  // Relógio da tela (1 s) e atualização: rápida com saguão aberto, mais calma no resto do tempo.
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { const id = setInterval(load, lobbyOpen ? 5000 : 20000); return () => clearInterval(id); }, [load, lobbyOpen]);
  // Quando um cronômetro zera (saguão fechou ou grupo voltou), busca o estado novo na hora.
  const nextEdge = d ? Math.min(...d.open.map((r) => Date.parse(r.phase === "lobby" ? r.departsAt : r.endsAt)), Infinity) : Infinity;
  useEffect(() => {
    if (!Number.isFinite(nextEdge)) return;
    const id = setTimeout(load, Math.max(500, nextEdge - now() + 800));
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextEdge, load]);

  async function act(body: object, ok?: string) {
    setBusy(true);
    try {
      const r = await post<{ outcome?: Outcome; reward?: Omit<Reward, "items"> & { items: { item: string; qty: number; sold?: number }[] } }>("/api/guild-expeditions/action", body);
      play("coin");
      if (ok) ctx.toast(ok);
      await Promise.all([load(), ctx.refresh()]);
      return r;
    } catch (e) {
      ctx.toast((e as Error).message, "error");
      await load();
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function claim(run: Run) {
    const r = await act({ type: "claim", id: run.id });
    if (!r?.reward || !r.outcome) return;
    play(r.outcome === "fail" ? "defeat" : "victory");
    setWon({ run, outcome: r.outcome, reward: { ...r.reward, items: r.reward.items.map((i) => ({ ...i, name: ITEM_BY_ID[i.item]?.name ?? i.item, image: ITEM_BY_ID[i.item]?.image ?? "", rarity: ITEM_BY_ID[i.item]?.rarity ?? "common" })) } });
  }

  if (d === undefined) return <p className="text-white/50">{t("Carregando expedições…")}</p>;
  if (!d || !d.guild) return <Panel className="p-6 text-center text-sm text-white/60">{t("As expedições não estão disponíveis agora. Tente de novo em instantes.")}</Panel>;

  const race = d.myRace ?? ctx.state.character.race;
  return (
    <div className="space-y-5">
      <Panel className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 basis-full sm:basis-0">
            <h2 className="font-display text-xl text-gold">🧭 {t("Expedições da Guilda")}</h2>
            <p className="text-sm text-white/60">{t("Use o ouro do tesouro para mandar o esquadrão em caçadas, missões e incursões. Todos que forem ganham a recompensa inteira.")}</p>
          </div>
          <Stat label={t("Tesouro da guilda")} value={`🪙 ${d.treasury.toLocaleString(t.locale)}`} />
          <Stat label={t("Seu poder")} value={`⚔️ ${d.myPower.toLocaleString(t.locale)}`} />
        </div>
        <details className="mt-3 rounded-lg bg-black/20 px-3 py-2 text-xs text-white/70">
          <summary className="cursor-pointer font-display text-sm text-white/80">{t("Como funciona")}</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>{t("Capitão, Vice-Capitão ou Líder de Esquadrão escolhe a expedição e a estratégia. O custo sai do tesouro da guilda.")}</li>
            <li>{t("Em grupo: abre um saguão de {n} minutos para os membros entrarem. Sozinho: parte na hora.", { n: Math.round(EXPEDITION_RULES.lobbySec / 60) })}</li>
            <li>{t("Quanto maior o poder do grupo, maior a chance de sucesso. Raças que conhecem o terreno dão +15% e cada raça diferente no grupo dá +4%.")}</li>
            <li>{t("Enquanto o grupo viaja você continua jogando normalmente. Na volta, cada um resgata a sua parte: XP, ouro, poções, baús e chance de equipamento da sua raça.")}</li>
            <li>{t("Triunfo dá 50% a mais e dobra a chance de itens. No fracasso volta só 25% e nenhum item.")}</li>
          </ol>
        </details>
        {!d.canOrganize && <p className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/60">{t("Só Capitão, Vice-Capitão e Líder de Esquadrão organizam expedições. Você pode entrar em qualquer uma durante o saguão.")}</p>}
      </Panel>

      {d.ready.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-display text-lg text-gold">🎁 {t("Prontas para resgatar")}</h3>
          {d.ready.map((r) => <RunCard key={r.id} run={r} now={now()} busy={busy} canOrganize={d.canOrganize} playerBusy={d.busy} onAct={act} onClaim={claim} />)}
        </section>
      )}

      {d.open.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-display text-lg text-gold">⏳ {t("Em andamento")} <span className="text-sm text-white/50">({d.activeCount}/{EXPEDITION_RULES.maxActive})</span></h3>
          {d.open.map((r) => <RunCard key={r.id} run={r} now={now()} busy={busy} canOrganize={d.canOrganize} playerBusy={d.busy} onAct={act} onClaim={claim} />)}
        </section>
      )}

      {(["hunt", "mission", "raid"] as ExpeditionKind[]).map((kind) => (
        <section key={kind} className="space-y-3">
          <h3 className="font-display text-lg text-gold">{KIND_ICON[kind]} {t(kind === "hunt" ? "Caçadas (curtas)" : kind === "mission" ? "Missões" : "Incursões (grupo grande)")}</h3>
          <div className="grid gap-3 lg:grid-cols-2">
            {EXPEDITIONS.filter((e) => e.kind === kind).map((e) => (
              <CatalogCard key={e.id} e={e} d={d} race={race} busy={busy}
                onStart={(strategy, solo) => act({ type: "start", expedition: e.id, strategy, solo }, solo ? t("Você partiu sozinho. Boa sorte!") : t("Saguão aberto! Avise a guilda."))} />
            ))}
          </div>
        </section>
      ))}

      {d.history.length > 0 && (
        <Panel className="p-4">
          <h3 className="mb-2 font-display text-lg text-gold">📜 {t("Últimas expedições")}</h3>
          <ul className="space-y-1.5 text-sm">
            {d.history.map((r) => {
              const e = EXPEDITION_BY_ID[r.key];
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg bg-black/30 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate">{KIND_ICON[e.kind]} {t(e.name)} <span className="text-white/40">· {r.members.length} {t("participante(s)")}</span></span>
                  {r.phase === "cancelled" ? <span className="text-xs text-white/50">{t("Cancelada (ouro devolvido)")}</span>
                    : r.outcome && <span className={`text-xs font-bold ${OUTCOME_STYLE[r.outcome]}`}>{OUTCOME_ICON[r.outcome]} {t(OUTCOME_LABEL[r.outcome])}</span>}
                  {r.reward && <span className="text-xs text-white/60">+{r.reward.xp} XP · 🪙 {r.reward.gold}{r.reward.items.filter((i) => !i.sold).map((i) => ` · ${t(i.name)}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join("")}</span>}
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      <AnimatePresence>
        {won && (
          <motion.div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setWon(null)}>
            <motion.div initial={{ scale: 0.9, y: 16 }} animate={{ scale: 1, y: 0 }} onClick={(ev) => ev.stopPropagation()} className="panel w-full max-w-md p-6 text-center" role="dialog" aria-modal="true">
              <p className="text-4xl" aria-hidden>{OUTCOME_ICON[won.outcome]}</p>
              <p className={`mt-1 font-display text-3xl font-black ${OUTCOME_STYLE[won.outcome]}`}>{t(OUTCOME_LABEL[won.outcome])}</p>
              <p className="text-sm text-white/60">{t(EXPEDITION_BY_ID[won.run.key].name)}</p>
              <p className="mt-4 font-display text-lg">✨ +{won.reward.xp.toLocaleString(t.locale)} XP · 🪙 +{won.reward.gold.toLocaleString(t.locale)}</p>
              {won.reward.levelUps > 0 && <p className="text-sm text-emerald-300">{t("Subiu de nível!")}</p>}
              {won.reward.items.length > 0 && (
                <ul className="mt-4 flex flex-wrap justify-center gap-3">
                  {won.reward.items.map((i, k) => (
                    <li key={k} className="w-24 text-center">
                      <span className={`relative mx-auto block h-16 w-16 rounded-lg bg-black/40 ring-2 ${RARITY_STYLE[i.rarity] ?? RARITY_STYLE.common}`}>
                        {i.image && <Image src={i.image} alt="" fill sizes="64px" className="object-contain p-0.5" />}
                        {i.qty > 1 && <span className="absolute -right-1 -top-1 rounded-full bg-gold px-1.5 text-[10px] font-bold text-ink">x{i.qty}</span>}
                      </span>
                      <span className="mt-1 block text-[11px] leading-tight">{t(i.name)}</span>
                      {i.sold ? <span className="block text-[10px] text-amber-300">{t("Bolsa cheia: virou 🪙 {n}", { n: i.sold })}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
              {won.outcome === "fail" && <p className="mt-3 text-xs text-white/50">{t("O grupo voltou de mãos quase vazias. Juntem mais gente ou mais poder na próxima!")}</p>}
              <button className="btn-gold mt-6 w-full" onClick={() => setWon(null)}>{t("Continuar")}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/30 px-3 py-2 text-center">
      <p className="text-[11px] text-white/50">{label}</p>
      <p className="font-display text-base text-gold">{value}</p>
    </div>
  );
}

/** Barra de chance de sucesso (com a fatia de triunfo). */
function Odds({ e, power, strategy }: { e: Expedition; power: number; strategy: Strategy }) {
  const t = useT();
  const o = expeditionOdds(e, power, strategy);
  const color = o.success >= 0.8 ? "bg-emerald-500" : o.success >= 0.5 ? "bg-amber-400" : "bg-red-500";
  return (
    <div>
      <div className="flex justify-between text-[11px] text-white/60">
        <span>{t("Poder do grupo")} <b className="text-white/90">{power.toLocaleString(t.locale)}</b> / {expeditionPower(e).toLocaleString(t.locale)}</span>
        <span>{t("Sucesso")} <b className="text-white/90">{pct(o.success)}</b> · {t("triunfo")} {pct(o.success * o.triumph)}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(o.success * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full transition-[width] duration-500 ${color}`} style={{ width: pct(o.success) }} />
      </div>
    </div>
  );
}

function RunCard({ run, now, busy, canOrganize, playerBusy, onAct, onClaim }: {
  run: Run; now: number; busy: boolean; canOrganize: boolean; playerBusy: boolean;
  onAct: (body: object, ok?: string) => Promise<unknown>; onClaim: (r: Run) => void;
}) {
  const t = useT();
  const e = EXPEDITION_BY_ID[run.key];
  const s = STRATEGIES[run.strategy] ?? STRATEGIES.balanced;
  const pp = partyPower(e, run.members);
  const left = Math.max(0, ((run.phase === "lobby" ? Date.parse(run.departsAt) : Date.parse(run.endsAt)) - now) / 1000);
  const total = Math.max(1, (Date.parse(run.endsAt) - Date.parse(run.departsAt)) / 1000);
  const full = run.members.length >= e.party;
  return (
    <Panel className={`overflow-hidden ${run.phase === "done" ? "ring-2 ring-gold/60" : run.phase === "lobby" ? "ring-1 ring-emerald-400/50" : ""}`}>
      <div className="flex flex-col gap-3 p-4 sm:flex-row">
        <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-lg sm:h-auto sm:w-32">
          <Image src={e.image} alt="" fill sizes="(max-width: 640px) 100vw, 128px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-display text-base">{KIND_ICON[e.kind]} {t(e.name)}</p>
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">{s.icon} {t(s.name)}</span>
            {run.organizer && <span className="text-[11px] text-white/50">{t("organizada por {x}", { x: run.organizer })}</span>}
          </div>

          {run.phase === "lobby" && (
            <p className="text-sm text-emerald-300">🚪 {t("Saguão aberto: o grupo parte em {x}", { x: fmtTime(left) })} <span className="text-white/50">· {run.members.length}/{e.party}</span></p>
          )}
          {run.phase === "running" && (
            <div>
              <p className="text-sm text-sky-300">🧭 {t("Em viagem: volta em {x}", { x: fmtTime(left) })}</p>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-sky-400 transition-[width] duration-1000" style={{ width: pct(1 - left / total) }} /></div>
            </div>
          )}
          {run.phase === "done" && run.outcome && (
            <div>
              <p className={`font-display text-lg ${OUTCOME_STYLE[run.outcome]}`}>{OUTCOME_ICON[run.outcome]} {t(OUTCOME_LABEL[run.outcome])}</p>
              {run.report.map((l, i) => <p key={i} className="text-xs italic text-white/60">“{t(l, { foe: t(e.foe) })}”</p>)}
            </div>
          )}

          {run.phase !== "done" && <Odds e={e} power={pp.total} strategy={run.strategy} />}

          <ul className="flex flex-wrap gap-1.5">
            {run.members.map((m) => (
              <li key={m.name} className={`rounded-full px-2 py-0.5 text-[11px] ${m.me ? "bg-gold/20 text-gold" : "bg-white/5 text-white/80"}`}
                title={`${t(raceName(m.race))} · ${t("Nv.")} ${m.level}`}>
                {e.favored.includes(m.race as RaceId) ? "★ " : ""}{m.name} <span className="text-white/50">⚔️{m.power.toLocaleString(t.locale)}</span>
              </li>
            ))}
            {run.phase === "lobby" && Array.from({ length: Math.max(0, e.party - run.members.length) }).map((_, i) => (
              <li key={`e${i}`} className="rounded-full border border-dashed border-white/15 px-2 py-0.5 text-[11px] text-white/30">{t("vaga livre")}</li>
            ))}
          </ul>
          {run.phase !== "done" && pp.diversity > 0 && <p className="text-[11px] text-emerald-300/80">{t("Bônus de {n} raças diferentes: +{p}% de poder", { n: pp.races, p: Math.round(pp.diversity * 100) })}</p>}

          <div className="flex flex-wrap gap-2 pt-1">
            {run.phase === "lobby" && !run.joined && (
              <button disabled={busy || full || playerBusy} onClick={() => onAct({ type: "join", id: run.id }, t("Você entrou no grupo!"))} className="btn-gold !px-4 !py-2 text-sm"
                title={playerBusy ? t("Você já está em outra expedição") : undefined}>{full ? t("Grupo cheio") : t("Entrar no grupo")}</button>
            )}
            {run.phase === "lobby" && run.joined && !run.mine && (
              <button disabled={busy} onClick={() => onAct({ type: "leave", id: run.id }, t("Você saiu do grupo."))} className="min-h-10 rounded-md bg-white/10 px-3 text-sm hover:bg-white/20">{t("Sair do grupo")}</button>
            )}
            {run.phase === "lobby" && run.mine && (
              <button disabled={busy} onClick={() => onAct({ type: "depart", id: run.id }, t("O grupo partiu!"))} className="btn-gold !px-4 !py-2 text-sm">{t("Partir agora")}</button>
            )}
            {run.phase === "lobby" && (run.mine || canOrganize) && (
              <button disabled={busy} onClick={() => window.confirm(t("Cancelar a expedição? O ouro volta para o tesouro.")) && onAct({ type: "cancel", id: run.id }, t("Expedição cancelada. O ouro voltou para o tesouro."))}
                className="min-h-10 rounded-md bg-red-900/50 px-3 text-sm hover:bg-red-800/60">{t("Cancelar")}</button>
            )}
            {run.phase === "running" && run.joined && <span className="text-xs text-white/50">{t("Você está neste grupo. Pode continuar jogando enquanto espera.")}</span>}
            {run.phase === "done" && run.joined && !run.claimed && (
              <button disabled={busy} onClick={() => onClaim(run)} className="btn-gold !px-5 !py-2 text-sm">🎁 {t("Resgatar recompensa")}</button>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function CatalogCard({ e, d, race, busy, onStart }: { e: Expedition; d: Data; race: string; busy: boolean; onStart: (s: Strategy, solo: boolean) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [strategy, setStrategy] = useState<Strategy>("balanced");
  const locked = d.level < e.guildLevel;
  const poor = d.treasury < e.cost;
  const pay = expeditionPayout(e, "success", strategy);
  const relic = e.relic ? ITEM_BY_ID[EXPEDITION_RELICS[race as RaceId]] : undefined;
  const gear = gearPool(e, race);
  const mine = partyPower(e, [{ power: d.myPower, race }]).total;
  const why = locked ? t("Guilda nível {n} necessária", { n: e.guildLevel }) : poor ? t("Faltam 🪙 {n} no tesouro", { n: (e.cost - d.treasury).toLocaleString(t.locale) })
    : d.busy ? t("Você já está em uma expedição") : d.activeCount >= EXPEDITION_RULES.maxActive ? t("Limite de expedições ao mesmo tempo") : "";
  return (
    <Panel className={`flex flex-col overflow-hidden ${locked ? "opacity-60" : ""}`}>
      <div className="relative h-28">
        <Image src={e.image} alt="" fill sizes="(max-width: 1024px) 100vw, 520px" className={`object-cover ${locked ? "grayscale" : ""}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-panel via-panel/40 to-transparent" />
        <div className="absolute inset-x-3 bottom-2 flex flex-wrap items-end justify-between gap-2">
          <p className="font-display text-lg leading-tight drop-shadow-[0_2px_4px_#000]">{locked ? "🔒 " : ""}{t(e.name)}</p>
          <span className="rounded bg-black/70 px-2 py-0.5 text-[11px]">{t(KIND_LABEL[e.kind])} · ⏱️ {duration(e.minutes)}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs text-white/60">{t(e.description)}</p>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className={`rounded px-1.5 py-0.5 ${poor ? "bg-red-900/50 text-red-200" : "bg-gold/15 text-gold"}`}>🪙 {e.cost.toLocaleString(t.locale)} {t("do tesouro")}</span>
          <span className={`rounded px-1.5 py-0.5 ${locked ? "bg-red-900/50 text-red-200" : "bg-white/5 text-white/70"}`}>🏰 {t("Guilda Nv. {n}", { n: e.guildLevel })}</span>
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-white/70">👥 {t("até {n}", { n: e.party })}</span>
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-white/70">⚔️ {t("poder {n}", { n: expeditionPower(e).toLocaleString(t.locale) })}</span>
          <span className={`rounded px-1.5 py-0.5 ${e.favored.includes(race as RaceId) ? "bg-emerald-800/60 text-emerald-200" : "bg-white/5 text-white/50"}`}>★ {e.favored.map((r) => t(raceName(r))).join(", ")}</span>
        </div>
        <p className="text-[11px] text-white/70">
          <b className="text-white/90">{t("Cada participante:")}</b> ✨ {pay.xp.toLocaleString(t.locale)} XP · 🪙 {pay.gold.toLocaleString(t.locale)} · 🧪 {e.potions[0]}–{e.potions[1]}
          {e.chest && ITEM_BY_ID[e.chest.item] ? ` · ${t(ITEM_BY_ID[e.chest.item].name)} ${pct(e.chest.chance)}` : ""}
        </p>
        <p className="text-[11px] text-white/70">
          {relic && <span className="text-amber-300">🌟 {t(relic.name)} {pct(e.relic ?? 0)} · </span>}
          {gear.length > 0 && <span>{t("equipamento de {x}", { x: t(raceName(race)) })} {pct(e.gear.chance)} <span className="text-white/40">({gear.slice(0, 2).map((g) => t(g.name)).join(", ")}{gear.length > 2 ? "…" : ""})</span></span>}
        </p>

        {d.canOrganize && !open && (
          <button disabled={busy || !!why} onClick={() => setOpen(true)} className="btn-gold mt-auto !py-2 text-sm">{why || t("Organizar")}</button>
        )}
        {!d.canOrganize && why && <p className="mt-auto text-[11px] text-white/40">{why}</p>}

        {open && (
          <div className="mt-auto space-y-2 rounded-lg bg-black/30 p-3">
            <p className="text-xs font-bold text-white/80">{t("Estratégia")}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(STRATEGIES) as Strategy[]).map((k) => (
                <button key={k} type="button" aria-pressed={strategy === k} onClick={() => setStrategy(k)}
                  className={`min-h-10 rounded-md px-1 text-xs ${strategy === k ? "bg-gold text-ink" : "bg-white/10 text-white/80"}`}>{STRATEGIES[k].icon} {t(STRATEGIES[k].name)}</button>
              ))}
            </div>
            <p className="text-[11px] text-white/60">{t(STRATEGIES[strategy].description)}</p>
            <Odds e={e} power={mine} strategy={strategy} />
            <p className="text-[11px] text-white/40">{t("A chance acima é só com você. Cada membro que entrar soma o poder dele.")}</p>
            <div className="grid grid-cols-2 gap-2">
              <button disabled={busy || !!why} onClick={() => { setOpen(false); onStart(strategy, false); }} className="btn-gold !px-2 !py-2 text-sm">👥 {t("Em grupo")}</button>
              <button disabled={busy || !!why} onClick={() => { setOpen(false); onStart(strategy, true); }} className="min-h-10 rounded-[10px] border border-white/20 px-2 text-sm hover:bg-white/5">🧍 {t("Ir sozinho")}</button>
            </div>
            <button onClick={() => setOpen(false)} className="w-full text-center text-[11px] text-white/50 hover:text-white/80">{t("Fechar")}</button>
          </div>
        )}
      </div>
    </Panel>
  );
}

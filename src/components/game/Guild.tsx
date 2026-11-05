"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import type { GameCtx } from "./GameApp";
import { GUILD, guildXpNext, ROLE_LABEL, type GuildRole } from "@/lib/game/guilds";
import { post } from "./api";
import { Bar, Panel } from "./ui";
import Avatar from "./Avatar";
import { play } from "./sfx";
import ChatBox from "./ChatBox";
import GuildBoss from "./GuildBoss";
import GuildWar from "./GuildWar";

type Member = { name: string; level: number; role: GuildRole; contributed: number; me: boolean; portrait: string; frame: string | null; active: boolean };
type MyGuild = { id: string; name: string; tag: string; description: string; level: number; xp: number; treasury: number; limit: number; myRole: GuildRole; members: Member[] };
type ListItem = { id: string; name: string; tag: string; description: string; level: number; limit: number; members: number };

export default function Guild({ ctx }: { ctx: GameCtx }) {
  const [mine, setMine] = useState<MyGuild | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"home" | "boss" | "war">("home");

  const load = useCallback(async () => {
    const r = await fetch("/api/guilds/mine", { cache: "no-store" });
    setMine(r.ok ? (await r.json()).guild : null);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(body: object, ok: string) {
    setBusy(true);
    try {
      await post("/api/guilds/action", body);
      play("coin");
      ctx.toast(ok);
      await Promise.all([load(), ctx.refresh()]);
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  if (mine === undefined) return <p className="text-white/50">Carregando guilda…</p>;
  if (!mine) return <NoGuild ctx={ctx} busy={busy} act={act} />;

  const lead = mine.myRole === "leader";
  const staff = lead || mine.myRole === "officer";
  const nav = (
    <div className="mb-4 flex flex-wrap gap-2">
      {([["home", `🏰 ${mine.name}`], ["boss", "🐉 Chefe da Guilda"], ["war", "⚔️ Guerra de Guildas"]] as const).map(([k, l]) => (
        <button key={k} onClick={() => setView(k)} className={`rounded-lg px-4 py-2 text-sm font-display ${view === k ? "bg-gold text-ink" : "bg-white/5 text-white/70"}`}>{l}</button>
      ))}
    </div>
  );
  if (view === "boss") return <>{nav}<GuildBoss ctx={ctx} /></>;
  if (view === "war") return <>{nav}<GuildWar ctx={ctx} /></>;
  return (
    <>{nav}
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <Panel className="relative overflow-hidden p-6">
          <div aria-hidden className="absolute -right-6 -top-10 font-display text-[9rem] font-black leading-none text-white/[0.04]">{mine.tag}</div>
          <div className="relative flex flex-wrap items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold to-ember font-display text-xl font-black text-ink shadow-lg">{mine.tag}</div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-2xl">{mine.name}</h2>
              <p className="text-sm text-white/60">{mine.description || "Sem descrição."}</p>
            </div>
          </div>
          <div className="relative mt-5 grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Bar label={`Nível ${mine.level}${mine.level >= GUILD.maxLevel ? " (máximo)" : ""} · XP da guilda`} value={mine.level >= GUILD.maxLevel ? 1 : mine.xp}
                max={mine.level >= GUILD.maxLevel ? 1 : guildXpNext(mine.level)} color="bg-gold" />
              <p className="mt-2 text-xs text-emerald-300">Bônus para todos os membros: +{mine.level * GUILD.xpPerLevelPct}% de XP</p>
            </div>
            <div className="rounded-lg bg-black/30 p-3 text-center">
              <p className="text-xs text-white/50">Cofre</p>
              <p className="font-display text-xl text-gold">🪙 {mine.treasury.toLocaleString("pt-BR")}</p>
            </div>
          </div>
          <Donate busy={busy} gold={ctx.state.wallet.gold} onDonate={(amount) => act({ type: "donate", amount }, `Doou 🪙 ${amount} para a guilda!`)} />
          <p className="relative mt-3 text-[11px] text-white/40">A guilda também ganha XP quando os membros jogam: missão +10, caçada +5, chefe +30, vitória na Arena +15.</p>
        </Panel>

        <Panel className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg text-gold">Membros ({mine.members.length}/{mine.limit})</h3>
            <button disabled={busy} onClick={() => act({ type: "leave" }, "Você saiu da guilda.")} className="rounded-md bg-white/5 px-3 py-1.5 text-xs hover:bg-red-900/40">Sair da guilda</button>
          </div>
          <ul className="space-y-2">
            {mine.members.map((m) => (
              <motion.li layout key={m.name} className={`flex flex-wrap items-center gap-3 rounded-lg px-3 py-2 ${m.me ? "bg-gold/10" : "bg-black/30"}`}>
                <div className="relative">
                  <Avatar src={m.portrait} frame={m.frame} size={40} />
                  <span title={m.active ? "Ativo nas últimas 24h" : "Inativo"} className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-panel ${m.active ? "bg-emerald-400" : "bg-white/20"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm">{m.name} <span className="text-white/50">· Nv. {m.level}</span></p>
                  <p className="text-[11px] text-white/50">{ROLE_LABEL[m.role]} · doou 🪙 {m.contributed.toLocaleString("pt-BR")}</p>
                </div>
                {!m.me && staff && (
                  <div className="flex flex-wrap gap-1 text-[11px]">
                    {lead && m.role === "member" && <Btn onClick={() => act({ type: "manage", target: m.name, op: "promote" }, `${m.name} agora é Oficial.`)} busy={busy}>Promover</Btn>}
                    {lead && m.role === "officer" && <Btn onClick={() => act({ type: "manage", target: m.name, op: "demote" }, `${m.name} voltou a Membro.`)} busy={busy}>Rebaixar</Btn>}
                    {lead && <Btn onClick={() => act({ type: "manage", target: m.name, op: "transfer" }, `${m.name} agora é o Líder.`)} busy={busy}>Passar liderança</Btn>}
                    {(lead || m.role === "member") && <Btn danger onClick={() => act({ type: "manage", target: m.name, op: "kick" }, `${m.name} foi removido.`)} busy={busy}>Expulsar</Btn>}
                  </div>
                )}
              </motion.li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className="flex h-[560px] flex-col p-4 lg:sticky lg:top-24">
        <h3 className="mb-2 font-display text-lg text-gold">💬 Chat da guilda</h3>
        <ChatBox channel="guild" ctx={ctx} />
      </Panel>
    </div>
    </>
  );
}

function Btn({ children, onClick, busy, danger }: { children: React.ReactNode; onClick: () => void; busy: boolean; danger?: boolean }) {
  return <button disabled={busy} onClick={onClick} className={`rounded px-2 py-1 ${danger ? "bg-red-900/50 hover:bg-red-800/60" : "bg-white/10 hover:bg-white/20"}`}>{children}</button>;
}

function Donate({ busy, gold, onDonate }: { busy: boolean; gold: number; onDonate: (n: number) => void }) {
  const [amount, setAmount] = useState(100);
  return (
    <div className="relative mt-4 flex flex-wrap items-center gap-2">
      <label htmlFor="donate-amount" className="text-sm text-white/70">Doar ouro:</label>
      {[100, 500, 1000].map((n) => (
        <button key={n} onClick={() => setAmount(n)} className={`rounded-md px-2.5 py-1 text-xs ${amount === n ? "bg-gold text-ink" : "bg-white/10"}`}>{n}</button>
      ))}
      <input id="donate-amount" type="number" min={GUILD.minDonation} value={amount} onChange={(e) => setAmount(Math.max(0, Math.floor(Number(e.target.value))))} className="input !w-28 !py-1 text-sm" />
      <button disabled={busy || amount < GUILD.minDonation || amount > gold} onClick={() => onDonate(amount)} className="btn-gold !px-4 !py-1.5 text-sm">Doar</button>
    </div>
  );
}

function NoGuild({ ctx, busy, act }: { ctx: GameCtx; busy: boolean; act: (b: object, ok: string) => Promise<void> }) {
  const [list, setList] = useState<ListItem[] | null>(null);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", tag: "", description: "" });

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/guilds?q=${encodeURIComponent(q)}`, { cache: "no-store" }).then((r) => r.json()).then((d) => setList(d.guilds ?? []));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const valid = /^[A-Za-zÀ-ÿ0-9 _]{3,20}$/.test(form.name) && /^[A-Za-z0-9]{2,4}$/.test(form.tag);
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-xl text-gold">🏰 Guildas</h2>
            <p className="text-sm text-white/60">Entre numa guilda para ganhar bônus de XP, um chat próprio e companheiros de caçada.</p>
          </div>
          <input id="guild-search" placeholder="Buscar por nome ou tag" value={q} onChange={(e) => setQ(e.target.value)} className="input !w-56 text-sm" aria-label="Buscar guilda" />
        </div>
        {!list ? <p className="text-white/50">Carregando…</p> : list.length === 0 ? (
          <Panel className="p-8 text-center text-white/60">Nenhuma guilda encontrada. Que tal fundar a primeira?</Panel>
        ) : list.map((g) => (
          <Panel key={g.id} className="flex flex-wrap items-center gap-4 p-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-gold/80 to-ember/80 font-display font-black text-ink">{g.tag}</div>
            <div className="min-w-0 flex-1">
              <p className="font-display">{g.name} <span className="text-xs text-white/50">· Nv. {g.level} · +{g.level}% XP</span></p>
              <p className="truncate text-xs text-white/60">{g.description || "Sem descrição."}</p>
            </div>
            <span className="text-xs text-white/60">{g.members}/{g.limit}</span>
            <button className="btn-gold !px-4 !py-2 text-sm" disabled={busy || g.members >= g.limit} onClick={() => act({ type: "join", guildId: g.id }, `Bem-vindo à ${g.name}!`)}>
              {g.members >= g.limit ? "Cheia" : "Entrar"}
            </button>
          </Panel>
        ))}
      </section>

      <Panel className="h-fit space-y-3 p-5">
        <h3 className="font-display text-lg text-gold">Fundar uma guilda</h3>
        <label className="block text-sm">
          <span className="mb-1 block text-white/70">Nome (3–20)</span>
          <input id="guild-name" className="input" maxLength={20} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-white/70">Tag (2–4 letras/números)</span>
          <input id="guild-tag" className="input uppercase" maxLength={4} value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value.toUpperCase() })} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-white/70">Descrição (opcional)</span>
          <textarea id="guild-desc" className="input" rows={3} maxLength={200} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <button className="btn-gold w-full" disabled={busy || !valid || ctx.state.wallet.gold < GUILD.createCost}
          onClick={() => act({ type: "create", ...form }, `Guilda ${form.name} fundada!`)}>
          Fundar por 🪙 {GUILD.createCost}
        </button>
      </Panel>
    </div>
  );
}

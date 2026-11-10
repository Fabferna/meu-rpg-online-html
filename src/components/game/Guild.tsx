"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import type { GameCtx } from "./GameApp";
import { GUILD, guildXpNext, guildPerks, ROLE_ICON, ROLE_LABEL, ROLES, assignableRoles, canKick, type GuildPerks, type GuildRole } from "@/lib/game/guilds";
import { post } from "./api";
import { Bar, Panel } from "./ui";
import Avatar from "./Avatar";
import { play } from "./sfx";
import ChatBox from "./ChatBox";
import ProfileCard from "./ProfileCard";
import GuildBoss from "./GuildBoss";
import GuildWar from "./GuildWar";
import GuildVault, { type Vault } from "./GuildVault";
import { useT } from "@/lib/i18n/client";

type Member = { name: string; level: number; role: GuildRole; contributed: number; me: boolean; portrait: string; frame: string | null; active: boolean };
type JoinRequest = { name: string; level: number; message: string; at: string; portrait: string; frame: string | null };
type MyGuild = {
  id: string; name: string; tag: string; description: string; level: number; xp: number; treasury: number; limit: number; myRole: GuildRole;
  members: Member[]; private: boolean; requests: JoinRequest[];
  perms: { requests: boolean; manage: boolean; settings: boolean; transfer: boolean };
  perks: GuildPerks; nextPerks: GuildPerks | null; vault: Vault;
};
type ListItem = { id: string; name: string; tag: string; description: string; level: number; limit: number; members: number; private: boolean; requested: boolean };

export default function Guild({ ctx }: { ctx: GameCtx }) {
  const t = useT();
  const [mine, setMine] = useState<MyGuild | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"home" | "vault" | "boss" | "war">("home");
  // Perfil de um membro (o mesmo cartão do Ranking/Chat: ver herói, adicionar amigo, mandar mensagem).
  const [profile, setProfile] = useState<string | null>(null);

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

  if (mine === undefined) return <p className="text-white/50">{t("Carregando guilda…")}</p>;
  if (!mine) return <NoGuild ctx={ctx} busy={busy} act={act} />;

  const perms = mine.perms;
  const roleCount = (r: GuildRole) => mine.members.filter((m) => m.role === r).length;
  const roleFull = (r: GuildRole) => (r === "officer" && roleCount(r) >= GUILD.maxVice) || (r === "squad_leader" && roleCount(r) >= GUILD.maxSquadLeaders);
  const nav = (
    <div className="mb-4 flex flex-wrap gap-2">
      {([["home", `🏰 ${mine.name}`], ["vault", "🎒 Cofre"], ["boss", "🐉 Chefe da Guilda"], ["war", "⚔️ Guerra de Guildas"]] as const).map(([k, l]) => (
        <button key={k} onClick={() => setView(k)} className={`rounded-lg px-4 py-2 text-sm font-display ${view === k ? "bg-gold text-ink" : "bg-white/5 text-white/70"}`}>{t(l)}</button>
      ))}
    </div>
  );
  if (view === "vault") return <>{nav}<GuildVault ctx={ctx} vault={mine.vault} role={mine.myRole} busy={busy} act={act} /></>;
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
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <PrivacyBadge priv={mine.private} />
                <span className="rounded bg-black/40 px-1.5 py-0.5 text-[11px] text-white/80">{t("Seu cargo:")} <b className="text-gold">{ROLE_ICON[mine.myRole]} {t(ROLE_LABEL[mine.myRole])}</b></span>
              </div>
              <Description text={mine.description} canEdit={perms.settings} busy={busy} onSave={(description) => act({ type: "describe", description }, t("Descrição atualizada."))} />
            </div>
          </div>
          <div className="relative mt-5 grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Bar label={`${t("Nível {n}", { n: mine.level })}${mine.level >= GUILD.maxLevel ? ` ${t("(máximo)")}` : ""} · ${t("XP da guilda")}`} value={mine.level >= GUILD.maxLevel ? 1 : mine.xp}
                max={mine.level >= GUILD.maxLevel ? 1 : guildXpNext(mine.level)} color="bg-gold" />
            </div>
            <div className="rounded-lg bg-black/30 p-3 text-center">
              <p className="text-xs text-white/50">{t("Cofre")}</p>
              <p className="font-display text-xl text-gold">🪙 {mine.treasury.toLocaleString(t.locale)}</p>
            </div>
          </div>
          <Perks level={mine.level} perks={mine.perks} next={mine.nextPerks} />
          <Donate busy={busy} gold={ctx.state.wallet.gold} onDonate={(amount) => act({ type: "donate", amount }, t("Doou 🪙 {n} para a guilda!", { n: amount }))} />
          {perms.settings && (
            <div className="relative mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-white/70">{t("Quem pode entrar:")}</span>
              {([[false, "🔓 Aberta (qualquer um entra)"], [true, "🔒 Privada (só com pedido aceito)"]] as const).map(([p, l]) => (
                <button key={String(p)} disabled={busy || mine.private === p}
                  onClick={() => act({ type: "privacy", privacy: p ? "private" : "open" }, p ? t("Guilda agora é privada.") : t("Guilda agora é aberta."))}
                  className={`rounded-md px-3 py-1 text-xs ${mine.private === p ? "bg-gold text-ink" : "bg-white/10 hover:bg-white/20"}`}>{t(l)}</button>
              ))}
            </div>
          )}
          <p className="relative mt-3 text-[11px] text-white/40">{t("Cada 🪙 doado vale 1 XP de guilda.")} {t("A guilda também ganha XP quando os membros jogam: missão +10, caçada +5, chefe +30, vitória na Arena +15.")}</p>
        </Panel>

        {perms.requests && (mine.private || mine.requests.length > 0) && (
          <Panel className="p-4">
            <h3 className="mb-3 font-display text-lg text-gold">{t("📨 Pedidos para entrar ({n})", { n: mine.requests.length })}</h3>
            {mine.requests.length === 0 ? <p className="text-sm text-white/50">{t("Nenhum pedido no momento.")}</p> : (
              <ul className="space-y-2">
                {mine.requests.map((r) => (
                  <li key={r.name} className="flex flex-wrap items-center gap-3 rounded-lg bg-black/30 px-3 py-2">
                    <button onClick={() => setProfile(r.name)} className="flex min-w-0 flex-1 basis-full items-center gap-3 text-left sm:basis-auto">
                      <Avatar src={r.portrait} frame={r.frame} size={40} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-sm hover:underline">{r.name} <span className="text-white/50">· {t("Nv.")} {r.level}</span></span>
                        <span className="block break-words text-xs text-white/70">{r.message ? `“${r.message}”` : t("(sem mensagem)")}</span>
                      </span>
                    </button>
                    <div className="flex gap-1 text-xs">
                      <button disabled={busy || mine.members.length >= mine.limit} onClick={() => act({ type: "decide", target: r.name, accept: true }, t("{x} entrou na guilda!", { x: r.name }))}
                        className="rounded bg-emerald-600 px-3 py-1.5 hover:bg-emerald-500">{t("Aceitar")}</button>
                      <Btn danger busy={busy} onClick={() => act({ type: "decide", target: r.name, accept: false }, t("Pedido recusado."))}>{t("Recusar")}</Btn>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        <Panel className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg text-gold">{t("Membros")} ({mine.members.length}/{mine.limit})</h3>
            <button disabled={busy} onClick={() => act({ type: "leave" }, "Você saiu da guilda.")} className="rounded-md bg-white/5 px-3 py-1.5 text-xs hover:bg-red-900/40">{t("Sair da guilda")}</button>
          </div>
          <ul className="space-y-2">
            {mine.members.map((m) => (
              <motion.li layout key={m.name} className={`flex flex-wrap items-center gap-3 rounded-lg px-3 py-2 ${m.me ? "bg-gold/10" : "bg-black/30"}`}>
                <button onClick={() => setProfile(m.name)} aria-label={t("Ver perfil de {x}", { x: m.name })}
                  className="flex min-h-11 min-w-0 flex-1 basis-full items-center gap-3 rounded-lg text-left transition hover:bg-white/5 sm:basis-auto">
                  <span className="relative shrink-0">
                    <Avatar src={m.portrait} frame={m.frame} size={40} />
                    <span title={m.active ? t("Ativo nas últimas 24h") : t("Inativo")} className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-panel ${m.active ? "bg-emerald-400" : "bg-white/20"}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-sm underline-offset-2 hover:underline">{m.name} <span className="text-white/50">· {t("Nv.")} {m.level}</span></span>
                    <span className="block text-[11px] text-white/50"><span className={ROLE_COLOR[m.role]}>{ROLE_ICON[m.role]} {t(ROLE_LABEL[m.role])}</span> · {t("doou")} 🪙 {m.contributed.toLocaleString(t.locale)}</span>
                  </span>
                </button>
                {!m.me && (assignableRoles(mine.myRole, m.role).length > 0 || perms.transfer || canKick(mine.myRole, m.role)) && (
                  <div className="flex flex-wrap items-center gap-1 text-[11px]">
                    {assignableRoles(mine.myRole, m.role).length > 0 && (
                      <select aria-label={t("Cargo de {x}", { x: m.name })} disabled={busy} value={m.role}
                        onChange={(e) => { const r = e.target.value as GuildRole; act({ type: "role", target: m.name, role: r }, t("{x} agora é {y}.", { x: m.name, y: t(ROLE_LABEL[r]) })); }}
                        className="min-h-8 rounded border-0 bg-white/10 px-2 text-[11px] text-white/90">
                        <option value={m.role}>{ROLE_ICON[m.role]} {t(ROLE_LABEL[m.role])}</option>
                        {assignableRoles(mine.myRole, m.role).map((r) => (
                          <option key={r} value={r} disabled={roleFull(r)}>{ROLE_ICON[r]} {t(ROLE_LABEL[r])}{roleFull(r) ? ` (${t("cheio")})` : ""}</option>
                        ))}
                      </select>
                    )}
                    {perms.transfer && <Btn onClick={() => window.confirm(t("Passar o comando da guilda para {x}? Você vira Vice-Capitão.", { x: m.name })) && act({ type: "manage", target: m.name, op: "transfer" }, t("{x} agora é o Capitão.", { x: m.name }))} busy={busy}>{t("Passar o comando")}</Btn>}
                    {canKick(mine.myRole, m.role) && <Btn danger onClick={() => act({ type: "manage", target: m.name, op: "kick" }, t("{x} foi removido.", { x: m.name }))} busy={busy}>{t("Expulsar")}</Btn>}
                  </div>
                )}
              </motion.li>
            ))}
          </ul>
          <Hierarchy />
        </Panel>
      </div>

      <Panel className="flex h-[560px] flex-col p-4 lg:sticky lg:top-24">
        <h3 className="mb-2 font-display text-lg text-gold">{t("💬 Chat da guilda")}</h3>
        <ChatBox channel="guild" ctx={ctx} onName={setProfile} />
      </Panel>
      <ProfileCard name={profile} onClose={() => setProfile(null)} onError={(m) => ctx.toast(m, "error")} />
    </div>
    </>
  );
}

const ROLE_COLOR: Record<GuildRole, string> = { leader: "text-gold", officer: "text-amber-200", squad_leader: "text-sky-300", member: "text-white/60" };

/** Benefícios do nível atual e o que o próximo nível libera. */
function Perks({ level, perks, next }: { level: number; perks: GuildPerks; next: GuildPerks | null }) {
  const t = useT();
  const rows: { icon: string; label: string; k: keyof GuildPerks; unit: string }[] = [
    { icon: "📈", label: "XP ganho", k: "xpPct", unit: "%" },
    { icon: "⚔️", label: "Ataque e magia", k: "atkPct", unit: "%" },
    { icon: "🛡️", label: "Defesa", k: "defPct", unit: "%" },
    { icon: "👥", label: "Vagas", k: "memberLimit", unit: "" },
    { icon: "🎒", label: "Espaços no cofre", k: "vaultSlots", unit: "" },
  ];
  const pct = (r: (typeof rows)[number], v: number) => (r.unit ? `+${v}${r.unit}` : String(v));
  return (
    <div className="relative mt-4 rounded-xl bg-black/30 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">{t("Benefícios da guilda (todos os membros)")}</p>
      <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {rows.map((r) => (
          <li key={r.k} className="rounded-lg bg-white/5 px-2 py-2 text-center">
            <span className="block text-lg" aria-hidden>{r.icon}</span>
            <span className="block font-display text-base text-gold">{pct(r, perks[r.k])}</span>
            <span className="block text-[10px] leading-tight text-white/60">{t(r.label)}</span>
            {next && next[r.k] > perks[r.k] && <span className="mt-0.5 block text-[10px] text-emerald-300">▲ {pct(r, next[r.k])}</span>}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-white/50">
        {next ? t("▲ = o que o nível {n} libera. O bônus de ataque e defesa vale em caçadas, masmorras, chefes e na Arena.", { n: level + 1 })
          : t("Nível máximo! O bônus de ataque e defesa vale em caçadas, masmorras, chefes e na Arena.")}
      </p>
    </div>
  );
}

function Description({ text, canEdit, busy, onSave }: { text: string; canEdit: boolean; busy: boolean; onSave: (d: string) => Promise<void> }) {
  const t = useT();
  const [draft, setDraft] = useState<string | null>(null);
  if (draft === null) return (
    <p className="mt-1 break-words text-sm text-white/60">
      {text || t("Sem descrição.")}
      {canEdit && <button onClick={() => setDraft(text)} className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-white/80 hover:bg-white/20">✏️ {t("Editar")}</button>}
    </p>
  );
  return (
    <div className="mt-1 space-y-2">
      <textarea className="input text-sm" rows={2} maxLength={200} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={t("Descrição da guilda")} autoFocus />
      <div className="flex gap-2">
        <button disabled={busy} onClick={async () => { await onSave(draft.trim()); setDraft(null); }} className="btn-gold !px-3 !py-1 text-xs">{t("Salvar")}</button>
        <button onClick={() => setDraft(null)} className="rounded-md bg-white/10 px-3 py-1 text-xs">{t("Cancelar")}</button>
      </div>
    </div>
  );
}

/** Quem pode o quê em cada cargo. */
function Hierarchy() {
  const t = useT();
  const can: Record<GuildRole, string> = {
    leader: "Tudo: define todos os cargos, expulsa, aceita membros, edita a guilda e pode passar o comando.",
    officer: "Acesso total à gestão: edita a guilda, aceita e expulsa membros, nomeia Líderes de Esquadrão. Paga metade da taxa do cofre.",
    squad_leader: "Aceita ou recusa pedidos de entrada. Paga 25% a menos de taxa no cofre.",
    member: "Doa, luta contra o Chefe, usa o chat e o cofre (retirar depois de 24h na guilda).",
  };
  const cap: Partial<Record<GuildRole, number>> = { leader: 1, officer: GUILD.maxVice, squad_leader: GUILD.maxSquadLeaders };
  return (
    <details className="mt-4 rounded-lg bg-black/20 px-3 py-2 text-xs">
      <summary className="cursor-pointer font-display text-sm text-white/80">{t("Cargos e permissões")}</summary>
      <ul className="mt-2 space-y-2">
        {ROLES.map((r) => (
          <li key={r}>
            <b className={ROLE_COLOR[r]}>{ROLE_ICON[r]} {t(ROLE_LABEL[r])}</b>
            {cap[r] && <span className="text-white/40"> · {t("até {n}", { n: cap[r]! })}</span>}
            <span className="block text-white/60">{t(can[r])}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function Btn({ children, onClick, busy, danger }: { children: React.ReactNode; onClick: () => void; busy: boolean; danger?: boolean }) {
  return <button disabled={busy} onClick={onClick} className={`rounded px-2 py-1 ${danger ? "bg-red-900/50 hover:bg-red-800/60" : "bg-white/10 hover:bg-white/20"}`}>{children}</button>;
}

function Donate({ busy, gold, onDonate }: { busy: boolean; gold: number; onDonate: (n: number) => void }) {
  const t = useT();
  const [amount, setAmount] = useState(100);
  return (
    <div className="relative mt-4 flex flex-wrap items-center gap-2">
      <label htmlFor="donate-amount" className="text-sm text-white/70">{t("Doar ouro:")}</label>
      {[100, 500, 1000].map((n) => (
        <button key={n} onClick={() => setAmount(n)} className={`rounded-md px-2.5 py-1 text-xs ${amount === n ? "bg-gold text-ink" : "bg-white/10"}`}>{n}</button>
      ))}
      <input id="donate-amount" type="number" min={GUILD.minDonation} value={amount} onChange={(e) => setAmount(Math.max(0, Math.floor(Number(e.target.value))))} className="input !w-28 !py-1 text-sm" />
      <button disabled={busy || amount < GUILD.minDonation || amount > gold} onClick={() => onDonate(amount)} className="btn-gold !px-4 !py-1.5 text-sm">{t("Doar")}</button>
    </div>
  );
}

function NoGuild({ ctx, busy, act }: { ctx: GameCtx; busy: boolean; act: (b: object, ok: string) => Promise<void> }) {
  const t = useT();
  const [list, setList] = useState<ListItem[] | null>(null);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", tag: "", description: "", privacy: "open" as "open" | "private" });
  const [asking, setAsking] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [reload, setReload] = useState(0);
  const send = async (b: object, ok: string) => { await act(b, ok); setAsking(null); setMsg(""); setReload((n) => n + 1); };

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/guilds?q=${encodeURIComponent(q)}`, { cache: "no-store" }).then((r) => r.json()).then((d) => setList(d.guilds ?? []));
    }, 250);
    return () => clearTimeout(t);
  }, [q, reload]);

  const valid = /^[A-Za-zÀ-ÿ0-9 _]{3,20}$/.test(form.name) && /^[A-Za-z0-9]{2,4}$/.test(form.tag);
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-xl text-gold">{t("🏰 Guildas")}</h2>
            <p className="text-sm text-white/60">{t("Entre numa guilda para ganhar bônus de XP, ataque e defesa, um cofre de itens compartilhado e um chat próprio.")}</p>
          </div>
          <input id="guild-search" placeholder={t("Buscar por nome ou tag")} value={q} onChange={(e) => setQ(e.target.value)} className="input !w-56 text-sm" aria-label={t("Buscar guilda")} />
        </div>
        {!list ? <p className="text-white/50">{t("Carregando…")}</p> : list.length === 0 ? (
          <Panel className="p-8 text-center text-white/60">Nenhuma guilda encontrada. Que tal fundar a primeira?</Panel>
        ) : list.map((g) => (
          <Panel key={g.id} className="flex flex-wrap items-center gap-4 p-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-gold/80 to-ember/80 font-display font-black text-ink">{g.tag}</div>
            <div className="min-w-0 flex-1">
              <p className="font-display">{g.name} <span className="text-xs text-white/50">· {t("Nv.")} {g.level} · +{guildPerks(g.level).xpPct}% XP · ⚔️+{guildPerks(g.level).atkPct}% · 🛡️+{guildPerks(g.level).defPct}%</span></p>
              <p className="truncate text-xs text-white/60">{g.description || t("Sem descrição.")}</p>
              <div className="mt-1"><PrivacyBadge priv={g.private} /></div>
            </div>
            <span className="text-xs text-white/60">{g.members}/{g.limit}</span>
            {g.members >= g.limit ? (
              <button className="btn-gold !px-4 !py-2 text-sm" disabled>{t("Cheia")}</button>
            ) : !g.private ? (
              <button className="btn-gold !px-4 !py-2 text-sm" disabled={busy} onClick={() => act({ type: "join", guildId: g.id }, t("Bem-vindo à {x}!", { x: g.name }))}>{t("Entrar")}</button>
            ) : g.requested ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-300">✔ {t("Pedido enviado")}</span>
                <button disabled={busy} onClick={() => send({ type: "cancel_request", guildId: g.id }, t("Pedido cancelado."))} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">{t("Cancelar")}</button>
              </div>
            ) : (
              <button className="btn-gold !px-4 !py-2 text-sm" disabled={busy} onClick={() => { setAsking(asking === g.id ? null : g.id); setMsg(""); }}>{t("Pedir para entrar")}</button>
            )}
            {asking === g.id && (
              <div className="basis-full space-y-2">
                <textarea className="input text-sm" rows={2} maxLength={200} value={msg} onChange={(e) => setMsg(e.target.value)} autoFocus
                  placeholder={t("Conte um pouco sobre você para o líder (opcional)")} aria-label={t("Mensagem do pedido")} />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setAsking(null)} className="rounded-md bg-white/10 px-3 py-1.5 text-sm">{t("Cancelar")}</button>
                  <button disabled={busy} onClick={() => send({ type: "request", guildId: g.id, message: msg }, t("Pedido enviado para {x}!", { x: g.name }))} className="btn-gold !px-4 !py-1.5 text-sm">{t("Enviar pedido")}</button>
                </div>
              </div>
            )}
          </Panel>
        ))}
      </section>

      <Panel className="h-fit space-y-3 p-5">
        <h3 className="font-display text-lg text-gold">{t("Fundar uma guilda")}</h3>
        <label className="block text-sm">
          <span className="mb-1 block text-white/70">{t("Nome (3–20)")}</span>
          <input id="guild-name" className="input" maxLength={20} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-white/70">{t("Tag (2–4 letras/números)")}</span>
          <input id="guild-tag" className="input uppercase" maxLength={4} value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value.toUpperCase() })} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-white/70">{t("Descrição (opcional)")}</span>
          <textarea id="guild-desc" className="input" rows={3} maxLength={200} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <div className="text-sm">
          <span className="mb-1 block text-white/70">{t("Quem pode entrar")}</span>
          <div className="grid grid-cols-2 gap-2">
            {([["open", "🔓 Aberta", "Qualquer um entra"], ["private", "🔒 Privada", "Só com pedido aceito"]] as const).map(([k, l, d]) => (
              <button key={k} type="button" onClick={() => setForm({ ...form, privacy: k })}
                className={`rounded-lg px-2 py-2 text-left ${form.privacy === k ? "bg-gold/20 ring-1 ring-gold" : "bg-white/5"}`}>
                <span className="block font-display text-sm">{t(l)}</span>
                <span className="block text-[11px] text-white/60">{t(d)}</span>
              </button>
            ))}
          </div>
        </div>
        <button className="btn-gold w-full" disabled={busy || !valid || ctx.state.wallet.gold < GUILD.createCost}
          onClick={() => act({ type: "create", ...form }, t("Guilda {x} fundada!", { x: form.name }))}>
          {t("Fundar por 🪙 {n}", { n: GUILD.createCost })}
        </button>
      </Panel>
    </div>
  );
}

function PrivacyBadge({ priv }: { priv: boolean }) {
  const t = useT();
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${priv ? "bg-violet-500/20 text-violet-200" : "bg-emerald-500/15 text-emerald-200"}`}>
      {priv ? t("🔒 PRIVADA · entra com pedido") : t("🔓 ABERTA · qualquer um entra")}
    </span>
  );
}

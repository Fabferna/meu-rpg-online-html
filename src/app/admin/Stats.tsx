// Painel de números do jogo (só leitura). Renderizado no servidor.
type Stats = {
  players: number; new_24h: number; new_7d: number; active_24h: number; active_7d: number; guilds: number; messages_24h: number;
  open_reports: number; avg_level: number; revenue_30d: Record<string, number>; refunds_30d: number; payers_total: number;
  gems_in_7d: number; gems_out_7d: number; gold_in_7d: number; gold_out_7d: number;
  signups_14d: { day: string; n: number }[]; levels: { band: number; n: number }[]; top_spend: { reason: string; gems: number }[];
};

const fmt = (n: number) => Number(n ?? 0).toLocaleString("pt-BR");
const money = (cents: number, cur: string) => new Intl.NumberFormat(cur === "BRL" ? "pt-BR" : "en-US", { style: "currency", currency: cur }).format(cents / 100);
const REASON: Record<string, string> = { energy_refill: "Recarga de energia", cosmetic: "Cosméticos", offer: "Ofertas limitadas", shop: "Loja (itens/elixir)", quest_rush: "Concluir missão", refund: "Estornos" };

export default function Stats({ s }: { s: Stats }) {
  const maxSign = Math.max(1, ...s.signups_14d.map((d) => d.n));
  const maxLvl = Math.max(1, ...s.levels.map((l) => l.n));
  const revenue = Object.entries(s.revenue_30d ?? {});
  const conv = s.players ? ((s.payers_total / s.players) * 100).toFixed(1) : "0";
  return (
    <section className="panel space-y-5 p-5">
      <h2 className="font-display text-lg text-gold">📊 Visão geral</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Jogadores", fmt(s.players), `+${fmt(s.new_24h)} hoje · +${fmt(s.new_7d)} na semana`],
          ["Ativos (24h / 7d)", `${fmt(s.active_24h)} / ${fmt(s.active_7d)}`, s.players ? `${Math.round((s.active_7d / s.players) * 100)}% ativos na semana` : ""],
          ["Receita 30 dias", revenue.length ? revenue.map(([c, v]) => money(v, c)).join(" + ") : "—", `${s.refunds_30d} estorno(s)`],
          ["Pagantes", fmt(s.payers_total), `${conv}% dos jogadores`],
          ["Nível médio", String(s.avg_level ?? 0), ""],
          ["Guildas", fmt(s.guilds), ""],
          ["Mensagens 24h", fmt(s.messages_24h), `${s.open_reports} denúncia(s) aberta(s)`],
          ["Gemas 7 dias", `+${fmt(s.gems_in_7d)} / −${fmt(s.gems_out_7d)}`, "entraram / gastas"],
        ].map(([label, value, sub]) => (
          <div key={label} className="rounded-lg bg-black/30 p-3">
            <p className="text-xs text-white/50">{label}</p>
            <p className="font-display text-xl text-gold tabular-nums">{value}</p>
            {sub && <p className="text-[11px] text-white/40">{sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div>
          <p className="mb-2 text-sm text-white/70">Novos jogadores por dia (14 dias)</p>
          <div className="flex h-32 items-end gap-1" role="img" aria-label="Gráfico de cadastros por dia">
            {s.signups_14d.map((d) => (
              <div key={d.day} className="group relative flex-1">
                <div className="rounded-t bg-gold/80" style={{ height: `${(d.n / maxSign) * 112 + 2}px` }} />
                <span className="absolute -top-5 left-1/2 hidden -translate-x-1/2 rounded bg-black px-1 text-[10px] group-hover:block">{d.n}</span>
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-white/40"><span>{s.signups_14d[0]?.day.slice(5)}</span><span>hoje</span></div>
        </div>
        <div>
          <p className="mb-2 text-sm text-white/70">Jogadores por faixa de nível</p>
          <ul className="space-y-1 text-xs">
            {s.levels.map((l) => (
              <li key={l.band} className="flex items-center gap-2">
                <span className="w-14 text-white/60">{l.band >= 30 ? "30+" : `${Math.max(1, l.band)}–${l.band + 4}`}</span>
                <span className="h-3 rounded bg-arcane" style={{ width: `${(l.n / maxLvl) * 100}%` }} />
                <span className="tabular-nums">{l.n}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-sm text-white/70">Onde as gemas são gastas (30 dias)</p>
          {s.top_spend.length === 0 ? <p className="text-xs text-white/40">Nenhum gasto ainda.</p> : (
            <ul className="space-y-1 text-xs">
              {s.top_spend.map((t) => <li key={t.reason} className="flex justify-between"><span>{REASON[t.reason] ?? t.reason}</span><b className="tabular-nums">💎 {fmt(t.gems)}</b></li>)}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-white/40">Ouro 7 dias: +{fmt(s.gold_in_7d)} / −{fmt(s.gold_out_7d)}. Se entra muito mais do que sai, a economia está inflacionando.</p>
        </div>
      </div>
    </section>
  );
}

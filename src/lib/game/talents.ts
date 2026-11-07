// Árvore de talentos: 1 ponto por nível a partir do nível 3 (até 38 no nível 40), gasto em 3 ramos.
// Cada ramo tem 4 andares; para abrir um andar é preciso ter gasto X pontos NAQUELE ramo.
// Em alguns andares há 2 talentos que se excluem (escolha um OU outro).
// Regras puras: o servidor valida e aplica no combate (heroStats); a tela usa as mesmas funções.

export type TalentMods = { atkPct: number; magicPct: number; defPct: number; hpPct: number; crit: number; dodge: number };
export const NO_TALENTS: TalentMods = { atkPct: 0, magicPct: 0, defPct: 0, hpPct: 0, crit: 0, dodge: 0 };

export type Branch = "furia" | "bastiao" | "arcano";
export const BRANCHES: { id: Branch; name: string; icon: string; color: string }[] = [
  { id: "furia", name: "Fúria", icon: "⚔️", color: "text-red-300" },
  { id: "bastiao", name: "Bastião", icon: "🛡️", color: "text-sky-300" },
  { id: "arcano", name: "Arcano", icon: "✨", color: "text-violet-300" },
];

export type Talent = {
  id: string; branch: Branch; tier: 1 | 2 | 3 | 4; name: string; description: string;
  maxRank: number; perRank: Partial<TalentMods>;
  /** Talentos do mesmo grupo se excluem (só um pode ter pontos). */
  group?: string;
};

/** Pontos gastos no ramo para abrir cada andar. */
export const TIER_REQ: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 5, 3: 8, 4: 11 };

export const TALENTS: Talent[] = [
  // ── Fúria: ataque físico e crítico ──
  { id: "f_lamina", branch: "furia", tier: 1, name: "Lâmina Afiada", description: "+2% de ataque físico por ponto.", maxRank: 5, perRank: { atkPct: 0.02 } },
  { id: "f_certeiro", branch: "furia", tier: 2, group: "f2", name: "Golpe Certeiro", description: "+1% de chance de crítico por ponto.", maxRank: 3, perRank: { crit: 0.01 } },
  { id: "f_selvagem", branch: "furia", tier: 2, group: "f2", name: "Fúria Selvagem", description: "+2,5% de ataque físico por ponto.", maxRank: 3, perRank: { atkPct: 0.025 } },
  { id: "f_brutal", branch: "furia", tier: 3, name: "Brutalidade", description: "+1,5% de ataque e +0,5% de crítico por ponto.", maxRank: 3, perRank: { atkPct: 0.015, crit: 0.005 } },
  { id: "f_mestre", branch: "furia", tier: 4, group: "f4", name: "Mestre de Armas", description: "+6% de ataque físico.", maxRank: 1, perRank: { atkPct: 0.06 } },
  { id: "f_sangue", branch: "furia", tier: 4, group: "f4", name: "Sede de Sangue", description: "+3% de crítico e +2% de esquiva.", maxRank: 1, perRank: { crit: 0.03, dodge: 0.02 } },
  // ── Bastião: defesa, vida e esquiva ──
  { id: "b_ferro", branch: "bastiao", tier: 1, name: "Pele de Ferro", description: "+3% de defesa por ponto.", maxRank: 5, perRank: { defPct: 0.03 } },
  { id: "b_vigor", branch: "bastiao", tier: 2, group: "b2", name: "Vigor", description: "+2% de vida em combate por ponto.", maxRank: 3, perRank: { hpPct: 0.02 } },
  { id: "b_reflexos", branch: "bastiao", tier: 2, group: "b2", name: "Reflexos", description: "+1% de esquiva por ponto.", maxRank: 3, perRank: { dodge: 0.01 } },
  { id: "b_muralha", branch: "bastiao", tier: 3, name: "Muralha", description: "+2% de defesa e +1,5% de vida por ponto.", maxRank: 3, perRank: { defPct: 0.02, hpPct: 0.015 } },
  { id: "b_inabalavel", branch: "bastiao", tier: 4, group: "b4", name: "Inabalável", description: "+8% de vida em combate.", maxRank: 1, perRank: { hpPct: 0.08 } },
  { id: "b_fantasma", branch: "bastiao", tier: 4, group: "b4", name: "Fantasma", description: "+4% de esquiva.", maxRank: 1, perRank: { dodge: 0.04 } },
  // ── Arcano: magia ──
  { id: "a_mente", branch: "arcano", tier: 1, name: "Mente Afiada", description: "+2% de poder mágico por ponto.", maxRank: 5, perRank: { magicPct: 0.02 } },
  { id: "a_foco", branch: "arcano", tier: 2, group: "a2", name: "Foco", description: "+2,5% de poder mágico por ponto.", maxRank: 3, perRank: { magicPct: 0.025 } },
  { id: "a_canal", branch: "arcano", tier: 2, group: "a2", name: "Canalização", description: "+1% de chance de crítico por ponto.", maxRank: 3, perRank: { crit: 0.01 } },
  { id: "a_fluxo", branch: "arcano", tier: 3, name: "Fluxo Arcano", description: "+1,5% de magia e +1,5% de vida por ponto.", maxRank: 3, perRank: { magicPct: 0.015, hpPct: 0.015 } },
  { id: "a_arquimago", branch: "arcano", tier: 4, group: "a4", name: "Arquimago", description: "+6% de poder mágico.", maxRank: 1, perRank: { magicPct: 0.06 } },
  { id: "a_ancestral", branch: "arcano", tier: 4, group: "a4", name: "Sabedoria Ancestral", description: "+3% de magia e +4% de defesa.", maxRank: 1, perRank: { magicPct: 0.03, defPct: 0.04 } },
];
export const TALENT_BY_ID: Record<string, Talent> = Object.fromEntries(TALENTS.map((t) => [t.id, t]));

export type TalentRanks = Record<string, number>;

/** Pontos de talento do nível: 1 por nível a partir do 3. */
export const talentPoints = (level: number) => Math.max(0, level - 2);
/** Preço em ouro para redistribuir todos os pontos. */
export const talentResetCost = (level: number) => Math.max(100, 50 * level);

/** Lê o JSON salvo e descarta o que não existe mais (talento removido, posto acima do máximo). */
export function normalizeTalents(raw: unknown): TalentRanks {
  const out: TalentRanks = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    const t = TALENT_BY_ID[id]; const n = Math.floor(Number(v));
    if (t && n > 0) out[id] = Math.min(n, t.maxRank);
  }
  return out;
}

export const spent = (r: TalentRanks) => Object.values(r).reduce((s, n) => s + n, 0);
export const spentIn = (r: TalentRanks, b: Branch) => TALENTS.filter((t) => t.branch === b).reduce((s, t) => s + (r[t.id] ?? 0), 0);

/** Pode colocar +1 ponto neste talento? Devolve o motivo se não puder. */
export function canLearn(r: TalentRanks, id: string, level: number): { ok: true } | { ok: false; reason: string } {
  const t = TALENT_BY_ID[id];
  if (!t) return { ok: false, reason: "Talento inexistente" };
  if ((r[id] ?? 0) >= t.maxRank) return { ok: false, reason: "No máximo" };
  if (spent(r) >= talentPoints(level)) return { ok: false, reason: "Sem pontos livres" };
  if (spentIn(r, t.branch) < TIER_REQ[t.tier]) return { ok: false, reason: `Gaste ${TIER_REQ[t.tier]} pontos neste ramo` };
  if (t.group && TALENTS.some((o) => o.group === t.group && o.id !== id && (r[o.id] ?? 0) > 0)) return { ok: false, reason: "Exclui a outra opção" };
  return { ok: true };
}

/** Bônus somados de todos os talentos. */
export function talentMods(r: TalentRanks): TalentMods {
  const m = { ...NO_TALENTS };
  for (const [id, n] of Object.entries(r)) {
    const t = TALENT_BY_ID[id];
    if (!t) continue;
    for (const [k, v] of Object.entries(t.perRank) as [keyof TalentMods, number][]) m[k] += v * n;
  }
  return m;
}

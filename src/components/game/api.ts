"use client";

export const ERROR_TEXT: Record<string, string> = {
  not_enough_energy: "Energia insuficiente.",
  quest_already_running: "Você já está em uma missão.",
  quest_not_finished: "A missão ainda não terminou.",
  in_battle: "Termine a batalha atual primeiro.",
  level_too_low: "Nível insuficiente.",
  hp_too_low: "Vida muito baixa. Descanse ou use uma poção.",
  hp_full: "Sua vida já está cheia.",
  no_item: "Você não tem esse item.",
  not_enough_points: "Pontos de atributo insuficientes.",
  target_cooldown: "Você já desafiou esse jogador demais nesta hora.",
  level_gap: "Diferença de nível muito grande.",
  too_many_requests: "Calma, guerreiro! Muitas ações seguidas.",
  stale_battle: "Ação duplicada ignorada.",
  goal_incomplete: "Objetivo ainda não concluído.",
  item_equipped: "Remova o item antes de vender.",
  already_in_guild: "Você já está em uma guilda.",
  guild_name_taken: "Já existe uma guilda com esse nome ou tag.",
  guild_full: "Esta guilda está cheia.",
  not_in_guild: "Você não está em uma guilda.",
  no_permission: "Você não tem permissão para isso.",
  invalid_name: "Nome inválido.",
  chat_links: "Links não são permitidos no chat.",
  boss_defeated: "O chefe já foi derrotado nesta semana!",
  muted: "Você está silenciado no chat por um tempo.",
  max_upgrade: "Este item já está no aprimoramento máximo (+10).",
  demo: "Modo demonstração: crie uma conta para jogar de verdade!",
  insufficient_funds: "Saldo insuficiente.",
  energy_full: "Sua energia já está cheia.",
  already_owned: "Você já possui isso.",
  daily_limit: "Limite de compras atingido.",
  sold_out: "Esgotado!",
  offer_expired: "Esta oferta terminou.",
  already_claimed: "Você já recebeu a recompensa de hoje.",
  quest_already_done: "A missão já terminou.",
  provider_unavailable: "Forma de pagamento indisponível.",
};

export async function post<T = { ok: true }>(url: string, body: unknown = {}): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(ERROR_TEXT[data.error] ?? "Algo deu errado. Tente novamente.");
  return data as T;
}

export function fmtTime(sec: number) {
  sec = Math.max(0, Math.ceil(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h >= 48) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}:${String(s).padStart(2, "0")}`;
}

export const RARITY_STYLE: Record<string, string> = {
  common: "ring-white/20",
  rare: "ring-sky-400/70 shadow-[0_0_18px_-4px_#38bdf8]",
  epic: "ring-fuchsia-400/70 shadow-[0_0_18px_-4px_#e879f9]",
  legendary: "ring-amber-300/80 shadow-[0_0_22px_-2px_#fcd34d]",
};
export const RARITY_LABEL: Record<string, string> = { common: "Comum", rare: "Raro", epic: "Épico", legendary: "Lendário" };

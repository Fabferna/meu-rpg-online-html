"use client";

export const ERROR_TEXT: Record<string, string> = {
  not_enough_energy: "Energia insuficiente.",
  wrong_race: "Esta skin é de outra raça.",
  guild_leader: "Passe a liderança da guilda antes de excluir o herói.",
  confirm_name: "Digite o nome do herói exatamente para confirmar.",
  unknown_skill: "Habilidade inválida.",
  unknown_player: "Nenhum herói com esse nome.",
  friend_limit: "Limite de 100 amigos atingido.",
  already_friends: "Vocês já são amigos.",
  already_requested: "Pedido de amizade já enviado.",
  no_slot: "Sem espaço livre. Compre um espaço de herói com gemas.",
  already_has_character: "Você já está com um herói ativo.",
  daily_hunts: "Você atingiu o limite de caçadas de hoje. Renove com gemas na Caçada ou volte amanhã!",
  daily_quests: "Você atingiu o limite de missões de hoje. Renove com gemas em Missões ou volte amanhã!",
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
  bag_full: "Sua bolsa está cheia. Venda ou use itens para abrir espaço.",
  invalid_sale: "Seleção de venda inválida.",
  not_enough_items: "Você não tem itens suficientes para esta encomenda.",
  wrong_item: "Este item não serve para esta encomenda.",
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
  region_locked: "Esta região ainda não foi liberada. Avance na História!",
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
  // Códigos que antes caíam no genérico "Algo deu errado".
  no_battle: "Esta batalha já terminou.",
  no_character: "Herói não encontrado. Recarregue a página.",
  invalid_action: "Ação inválida neste momento.",
  invalid_input: "Dados inválidos.",
  unknown_enemy: "Inimigo desconhecido.",
  unknown_item: "Item desconhecido.",
  unauthorized: "Sua sessão expirou. Entre novamente.",
  bad_origin: "Sua sessão expirou. Recarregue a página.",
  not_owner: "Este item não é seu.",
  not_equippable: "Este item não pode ser equipado.",
  not_found: "Não encontrado.",
  invalid_points: "Distribuição de pontos inválida.",
  invalid_target: "Alvo inválido.",
  no_quest: "Nenhuma missão em andamento.",
  unknown_goal: "Objetivo desconhecido.",
  unknown_guild: "Guilda não encontrada.",
  unknown_offer: "Oferta indisponível.",
  unknown_opponent: "Oponente não encontrado.",
  unknown_quest: "Missão desconhecida.",
  unknown_product: "Produto indisponível.",
  internal_error: "Erro no servidor. Tente de novo em instantes.",
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

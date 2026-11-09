import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type PlayerCounters = { registered: number; online: number };

/** Quem deu sinal nos últimos 3 minutos conta como online (o jogo avisa a cada 1 minuto). */
export const ONLINE_WINDOW_SEC = 180;
/** A contagem é guardada por alguns segundos: mil visitantes na página inicial não viram mil consultas ao banco. */
const CACHE_MS = 15_000;

let cache: { at: number; value: PlayerCounters } | null = null;

export async function playerCounters(admin = createAdminClient()): Promise<PlayerCounters | null> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const { data, error } = await admin.rpc("player_counters", { p_window_sec: ONLINE_WINDOW_SEC });
  // Migração 0044 ainda não aplicada (ou banco fora do ar): os marcadores simplesmente não aparecem.
  if (error || !data) return cache?.value ?? null;
  const d = data as { registered?: number; online?: number };
  const value = { registered: Number(d.registered ?? 0), online: Number(d.online ?? 0) };
  cache = { at: Date.now(), value };
  return value;
}

/** Marca o jogador como online agora. Depois de um batimento ele conta pelo menos a si mesmo. */
export async function pingPresence(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { error } = await admin.rpc("presence_ping", { p_user: userId });
  if (error) return null;
  const c = await playerCounters(admin);
  return c ? { ...c, online: Math.max(1, c.online) } : null;
}

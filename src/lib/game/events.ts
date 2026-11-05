// Eventos ativos (espelho de event_multiplier no SQL), para exibir no jogo.
export type GameEvent = { id: string; name: string; description: string; kind: "xp" | "gold"; multiplier: number; starts_at: string | null; ends_at: string | null; recurring_weekend: boolean; enabled: boolean };

export function activeEvents(events: GameEvent[], now = new Date()) {
  const dow = now.getUTCDay(); // 0 domingo, 6 sábado
  const weekend = dow === 0 || dow === 6;
  const nextMonday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + (dow === 0 ? 1 : 2));
  return events.filter((e) => e.enabled).flatMap((e) => {
    if (e.starts_at && e.ends_at && now >= new Date(e.starts_at) && now <= new Date(e.ends_at)) return [{ ...e, endsAt: e.ends_at }];
    if (e.recurring_weekend && weekend) return [{ ...e, endsAt: new Date(nextMonday).toISOString() }];
    return [];
  });
}

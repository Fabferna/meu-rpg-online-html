import "server-only";

// Rate limit de janela fixa. Em produção (várias instâncias serverless)
// configure o Upstash Redis; sem ele, cai num Map em memória.
const memory = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    const redisKey = `rl:${key}:${Math.floor(Date.now() / 1000 / windowSec)}`;
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, String(windowSec)],
      ]),
      cache: "no-store",
    });
    if (!res.ok) return true; // falha aberta: não derruba o jogo se o Redis cair
    const [[, count]] = (await res.json()) as [[unknown, number]];
    return count <= limit;
  }

  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

// Utilidades dos testes de rota: cria heróis no banco local e chama as rotas reais do Next.
import { pool } from "./fakeSupabase";
import { RACES, type RaceId } from "../../src/lib/game/data";
import { maxHp } from "../../src/lib/game/rules";

export type Hero = { userId: string; race: RaceId; level: number };

/** Cria conta + herói no nível pedido, com pontos distribuídos como um jogador "típico" da raça. */
export async function makeHero(opts: {
  race: RaceId; level: number; chapter?: number; gear?: string[]; skills?: { lv: Record<string, number>; eq: string[] };
  potions?: number; gold?: number; name?: string;
}): Promise<Hero> {
  const { rows } = await pool.query("insert into auth.users (email) values ($1) returning id", [`t${Date.now()}${Math.random()}@x.dev`]);
  const userId = rows[0].id as string;
  const a = { ...RACES[opts.race].attributes };
  const pts = (opts.level - 1) * 3;
  // Distribuição: 2/3 no atributo principal da raça, 1/3 em CON.
  const main: keyof typeof a = opts.race === "aetheliano" ? "intel" : opts.race === "elfo" ? "dex" : "str";
  a[main] += Math.round(pts * 2 / 3); a.con += pts - Math.round(pts * 2 / 3);
  const hp = maxHp(a, opts.level);
  const name = (opts.name ?? `T${Math.random().toString(36).slice(2, 10)}`).slice(0, 16);
  await pool.query(
    "select public.create_character($1,$2,$3,'sylvandell','male',$4,$5,$6,$7,$8,$9,$10,100,0)",
    [userId, name, opts.race, a.str, a.dex, a.con, a.intel, a.wis, a.cha, hp],
  );
  await pool.query("update public.characters set level=$2, story_chapter=$3, hp=$4, hp_updated_at=now(), skills=$5 where user_id=$1",
    [userId, opts.level, opts.chapter ?? 0, hp, JSON.stringify(opts.skills ?? {})]);
  if (opts.gold) await pool.query("update public.wallets set gold=$2 where user_id=$1", [userId, opts.gold]);
  for (const it of opts.gear ?? []) {
    await pool.query("select public.give_item($1,$2,1)", [userId, it]);
    await pool.query("update public.inventory set equipped=true where user_id=$1 and item_id=$2", [userId, it]);
  }
  if (opts.potions) await pool.query("select public.give_item($1,'pocao_vida',$2)", [userId, opts.potions]);
  return { userId, race: opts.race, level: opts.level };
}

type Route = { POST: (r: Request) => Promise<Response> };

/** Chama uma rota POST como o navegador faria (mesma origem, usuário logado). */
export async function call(route: Route, userId: string, body: unknown) {
  (globalThis as { __TEST_USER__?: string }).__TEST_USER__ = userId;
  const req = new Request("http://localhost:3000/api/x", {
    method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3000", host: "localhost:3000" },
    body: JSON.stringify(body),
  });
  const res = await route.POST(req);
  return { status: res.status, json: await res.json() as Record<string, unknown> };
}

export async function healHero(userId: string) {
  await pool.query("update public.characters set hp = 99999, hp_updated_at = now() where user_id=$1", [userId]);
}

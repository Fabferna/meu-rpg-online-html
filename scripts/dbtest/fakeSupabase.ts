// Cliente "Supabase" mínimo sobre um Postgres local (pg), só para os testes de rota.
// Cobre o subconjunto usado pelas rotas: from().select/insert/update/delete + eq/order/limit
// + single/maybeSingle, e rpc(). Não é usado em produção.
import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.PGHOST ?? "/tmp", port: Number(process.env.PGPORT ?? 5433),
  user: process.env.PGUSER ?? "postgres", database: process.env.PGDATABASE ?? "aeth_test",
});

// Relações embutidas usadas no código (ex.: inventory → items(data)).
const EMBED: Record<string, { fk: string; table: string; pk: string }> = {
  items: { fk: "item_id", table: "items", pk: "id" },
  guilds: { fk: "guild_id", table: "guilds", pk: "id" },
};

type Err = { message: string; code?: string };
type Res = { data: unknown; error: Err | null; count?: number | null };
const toParam = (v: unknown) => (v !== null && typeof v === "object" && !(v instanceof Date) ? JSON.stringify(v) : v);

class Query implements PromiseLike<Res> {
  private filters: [string, string, unknown][] = [];
  private op: "select" | "insert" | "update" | "delete" = "select";
  private payload: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private cols = "*";
  private returning = false;
  private head = false;
  private countMode = false;
  private orderBy: string | null = null;
  private lim: number | null = null;
  private mode: "many" | "single" | "maybe" = "many";
  constructor(private table: string) {}
  select(cols = "*", opts?: { count?: string; head?: boolean }) {
    if (this.op === "select") this.cols = cols; else this.returning = true;
    if (opts?.count) this.countMode = true;
    if (opts?.head) this.head = true;
    return this;
  }
  insert(v: Record<string, unknown> | Record<string, unknown>[]) { this.op = "insert"; this.payload = v; return this; }
  update(v: Record<string, unknown>) { this.op = "update"; this.payload = v; return this; }
  delete() { this.op = "delete"; return this; }
  eq(c: string, v: unknown) { this.filters.push([c, "=", v]); return this; }
  neq(c: string, v: unknown) { this.filters.push([c, "<>", v]); return this; }
  gt(c: string, v: unknown) { this.filters.push([c, ">", v]); return this; }
  gte(c: string, v: unknown) { this.filters.push([c, ">=", v]); return this; }
  lt(c: string, v: unknown) { this.filters.push([c, "<", v]); return this; }
  lte(c: string, v: unknown) { this.filters.push([c, "<=", v]); return this; }
  in(c: string, v: unknown[]) { this.filters.push([c, "in", v]); return this; }
  is(c: string, v: null | boolean) { this.filters.push([c, v === null ? "is null" : `is ${v}`, undefined]); return this; }
  order(c: string, o?: { ascending?: boolean }) { this.orderBy = `${c} ${o?.ascending === false ? "desc" : "asc"}`; return this; }
  limit(n: number) { this.lim = n; return this; }
  single() { this.mode = "single"; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }

  private where(params: unknown[]) {
    if (!this.filters.length) return "";
    return " where " + this.filters.map(([c, op, v]) => {
      if (op.startsWith("is ")) return `t.${c} ${op}`;
      params.push(v);
      return op === "in" ? `t.${c} = any($${params.length})` : `t.${c} ${op} $${params.length}`;
    }).join(" and ");
  }
  private projection() {
    const parts: string[] = [];
    const re = /(\w+)\(([^)]*)\)|([\w*]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(this.cols))) {
      if (m[1]) {
        const e = EMBED[m[1]];
        const inner = m[2].split(",").map((s) => s.trim()).map((c) => `'${c}', x.${c}`).join(", ");
        parts.push(`'${m[1]}', (select jsonb_build_object(${inner}) from public.${e.table} x where x.${e.pk} = t.${e.fk})`);
      } else if (m[3] === "*") parts.push("*");
      else parts.push(`'${m[3]}', t.${m[3]}`);
    }
    const rest = parts.filter((p) => p !== "*");
    if (parts.includes("*")) return rest.length ? `to_jsonb(t) || jsonb_build_object(${rest.join(", ")})` : "to_jsonb(t)";
    return `jsonb_build_object(${rest.join(", ")})`;
  }
  async run(): Promise<Res> {
    const params: unknown[] = [];
    let sql: string;
    if (this.op === "select") {
      sql = `select ${this.countMode && this.head ? "count(*)::int as n" : `${this.projection()} as r`} from public.${this.table} t${this.where(params)}`;
      if (this.orderBy && !this.head) sql += ` order by t.${this.orderBy}`;
      if (this.lim) sql += ` limit ${this.lim}`;
    } else if (this.op === "insert") {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload!];
      const keys = Object.keys(rows[0]);
      const vals = rows.map((r) => `(${keys.map((k) => { params.push(toParam(r[k])); return `$${params.length}`; }).join(", ")})`).join(", ");
      sql = `insert into public.${this.table} as t (${keys.join(", ")}) values ${vals} returning to_jsonb(t) as r`;
    } else if (this.op === "update") {
      const p = this.payload as Record<string, unknown>;
      const sets = Object.keys(p).map((k) => { params.push(toParam(p[k])); return `${k} = $${params.length}`; }).join(", ");
      sql = `update public.${this.table} t set ${sets}${this.where(params)} returning to_jsonb(t) as r`;
    } else {
      sql = `delete from public.${this.table} t${this.where(params)} returning to_jsonb(t) as r`;
    }
    try {
      const q = await pool.query(sql, params);
      if (this.countMode && this.head) return { data: null, error: null, count: q.rows[0].n };
      const rows = q.rows.map((r) => r.r);
      if (this.op !== "select" && !this.returning && this.mode === "many") return { data: null, error: null };
      if (this.mode === "single") return rows.length === 1 ? { data: rows[0], error: null } : { data: null, error: { message: "multiple (or no) rows returned", code: "PGRST116" } };
      if (this.mode === "maybe") return { data: rows[0] ?? null, error: null };
      return { data: rows, error: null, count: this.countMode ? rows.length : null };
    } catch (e) {
      const err = e as Err;
      return { data: null, error: { message: err.message, code: err.code } };
    }
  }
  then<A = Res, B = never>(ok?: ((v: Res) => A | PromiseLike<A>) | null, ko?: ((r: unknown) => B | PromiseLike<B>) | null) {
    return this.run().then(ok, ko);
  }
}

export function fakeAdmin() {
  return {
    from: (t: string) => new Query(t),
    async rpc(fn: string, args: Record<string, unknown>) {
      const keys = Object.keys(args);
      const sql = `select public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as r`;
      try {
        const q = await pool.query(sql, keys.map((k) => toParam(args[k])));
        return { data: q.rows[0]?.r ?? null, error: null };
      } catch (e) {
        const err = e as Err;
        return { data: null, error: { message: err.message, code: err.code } };
      }
    },
  };
}

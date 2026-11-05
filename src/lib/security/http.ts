import "server-only";
import { NextResponse } from "next/server";

export function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Proteção CSRF para rotas que mudam estado: exige que o Origin da
 * requisição seja o próprio site. Cookies SameSite=Lax + esta checagem
 * impedem que outro site dispare ações em nome do jogador.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Evita open-redirect: só aceita caminhos internos. */
export function safeNextPath(next: string | null | undefined, fallback = "/jogo"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

import { NextResponse } from "next/server";
import { playerCounters } from "@/lib/game/counters";

export const dynamic = "force-dynamic";

// Público (aparece na página inicial): só os dois totais, sem nenhum dado de jogador.
export async function GET() {
  const c = await playerCounters().catch(() => null);
  if (!c) return NextResponse.json({ error: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(c, { headers: { "Cache-Control": "public, max-age=10, s-maxage=15, stale-while-revalidate=30" } });
}

"use client";

import { useEffect, useState } from "react";
import { Panel } from "./ui";

type Row = { pos: number; name: string; raceName: string; level: number; pvp_rating: number; pvp_wins: number; pvp_losses: number };

export default function Ranking() {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    fetch("/api/ranking").then((r) => r.json()).then((d) => setRows(d.rows ?? []));
  }, []);
  const medal = ["🥇", "🥈", "🥉"];
  return (
    <Panel className="overflow-x-auto p-2">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-white/40">
          <tr><th className="p-3">#</th><th>Herói</th><th>Raça</th><th>Nível</th><th>Rating</th><th>V/D</th></tr>
        </thead>
        <tbody>
          {(rows ?? []).map((r) => (
            <tr key={r.name} className="border-t border-white/5">
              <td className="p-3 font-display">{medal[r.pos - 1] ?? r.pos}</td>
              <td className="font-display">{r.name}</td>
              <td className="text-white/60">{r.raceName}</td>
              <td>{r.level}</td>
              <td className="font-display text-gold">{r.pvp_rating}</td>
              <td className="text-white/60">{r.pvp_wins}/{r.pvp_losses}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows?.length === 0 && <p className="p-6 text-center text-white/50">Ninguém no ranking ainda.</p>}
      {!rows && <p className="p-6 text-center text-white/50">Carregando…</p>}
    </Panel>
  );
}

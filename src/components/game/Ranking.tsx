"use client";

import { useEffect, useState } from "react";
import { Panel } from "./ui";
import Avatar from "./Avatar";

type Row = { pos: number; name: string; raceName: string; level: number; pvp_rating: number; pvp_wins: number; pvp_losses: number; portrait: string; frame: string | null; title: string | null };

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
              <td><div className="flex items-center gap-2 py-1"><Avatar src={r.portrait} frame={r.frame} size={36} /><div><p className="font-display">{r.name}</p>{r.title && <p className="text-[11px] text-amber-200/80">« {r.title} »</p>}</div></div></td>
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

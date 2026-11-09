"use client";

import { useState } from "react";
import Image from "next/image";
import type { GameCtx } from "./GameApp";
import { ITEM_BY_ID, upgradedStats } from "@/lib/game/items";
import { GUILD, VAULT_FEE_MULT, type GuildRole } from "@/lib/game/guilds";
import { BAG_LIMIT } from "@/lib/game/loot";
import { fmtTime, RARITY_LABEL, RARITY_STYLE } from "./api";
import { SLOT_LABEL, statText } from "./Inventory";
import { Panel } from "./ui";
import { useT } from "@/lib/i18n/client";

export type VaultItem = { id: string; itemId: string; qty: number; upgrade: number; name: string; kind: string; rarity: string; image: string; slot: string | null; fee: number };
export type VaultLog = { id: number; name: string; action: "deposit" | "withdraw"; item: string; qty: number; upgrade: number; fee: number; at: string };
export type Vault = { slots: number; lockedUntil: string | null; items: VaultItem[]; log: VaultLog[] };

type Act = (body: object, ok: string) => Promise<void>;

/** Cofre de itens da guilda: todos guardam de graça; retirar custa uma taxa em ouro que vai para o tesouro. */
export default function GuildVault({ ctx, vault, role, busy, act }: { ctx: GameCtx; vault: Vault; role: GuildRole; busy: boolean; act: Act }) {
  const t = useT();
  const gold = ctx.state.wallet.gold;
  const bag = ctx.state.inventory.filter((i) => !i.equipped && i.kind !== "cosmetic");
  const bagUsed = ctx.state.inventory.filter((i) => !i.equipped).length;
  const full = vault.items.length >= vault.slots;
  const lockedSec = vault.lockedUntil ? Math.max(0, (Date.parse(vault.lockedUntil) - Date.now()) / 1000) : 0;
  const discount = Math.round((1 - VAULT_FEE_MULT[role]) * 100);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <Panel className="p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="font-display text-lg text-gold">{t("🎒 Cofre da guilda")}</h3>
              <p className="text-xs text-white/60">{t("Guardar é grátis. Para retirar, você paga uma taxa em ouro que vai para o tesouro da guilda.")}</p>
            </div>
            <span className={`rounded-lg px-3 py-1 font-display text-sm ${full ? "bg-red-900/40 text-red-200" : "bg-black/30 text-white/80"}`}>{t("{a}/{b} espaços", { a: vault.items.length, b: vault.slots })}</span>
          </div>
          {discount > 0 && <p className="mt-2 text-xs text-emerald-300">{t("Seu cargo paga {n}% a menos de taxa.", { n: discount })}</p>}
          {lockedSec > 0 && <p className="mt-2 rounded-lg bg-amber-900/30 px-3 py-2 text-xs text-amber-200">{t("Membros novos só retiram depois de {n}h na guilda. Falta {x}.", { n: GUILD.vaultMinHours, x: fmtTime(lockedSec) })}</p>}

          {vault.items.length === 0 ? (
            <p className="mt-4 rounded-lg bg-black/30 p-6 text-center text-sm text-white/50">{t("O cofre está vazio. Guarde um item da sua bolsa para ajudar a guilda!")}</p>
          ) : (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {vault.items.map((v) => (
                <VaultRow key={v.id} v={v} busy={busy} gold={gold} locked={lockedSec > 0} bagFull={bagUsed >= BAG_LIMIT && !(v.kind === "consumable" && bag.some((b) => b.itemId === v.itemId))}
                  onWithdraw={(qty) => act({ type: "vault_withdraw", vaultId: v.id, qty }, t("Retirou {x} do cofre por 🪙 {n}.", { x: t(v.name), n: v.fee * qty }))} />
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="p-4">
          <h3 className="font-display text-lg text-gold">{t("Guardar da sua bolsa")}</h3>
          <p className="text-xs text-white/60">{t("Itens equipados não aparecem aqui. Depois de guardado, o item passa a ser da guilda.")}</p>
          {full && <p className="mt-2 text-xs text-red-200">{t("Cofre cheio: só dá para empilhar consumíveis que já estão lá. Subam o nível da guilda para abrir espaços.")}</p>}
          {bag.length === 0 ? <p className="mt-3 text-sm text-white/50">{t("Sua bolsa não tem itens para guardar.")}</p> : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {bag.map((it) => (
                <BagRow key={it.id} busy={busy} name={it.name} qty={it.qty} upgrade={it.upgrade} rarity={it.rarity} image={ITEM_BY_ID[it.itemId]?.image ?? String(it.data.image ?? "")}
                  blocked={full && !(it.kind === "consumable" && vault.items.some((v) => v.itemId === it.itemId))}
                  onDeposit={(qty) => act({ type: "vault_deposit", inventoryId: it.id, qty }, t("{x} guardado no cofre.", { x: t(it.name) }))} />
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel className="h-fit p-4">
        <h3 className="mb-2 font-display text-lg text-gold">{t("📜 Histórico do cofre")}</h3>
        {vault.log.length === 0 ? <p className="text-sm text-white/50">{t("Nenhuma movimentação ainda.")}</p> : (
          <ul className="space-y-1.5 text-xs">
            {vault.log.map((l) => (
              <li key={l.id} className="rounded-lg bg-black/30 px-3 py-2">
                <span className={l.action === "deposit" ? "text-emerald-300" : "text-amber-200"}>{l.action === "deposit" ? "⬇️" : "⬆️"}</span>{" "}
                <b>{l.name}</b> {l.action === "deposit" ? t("guardou") : t("retirou")} {t(l.item)}{l.upgrade > 0 ? ` +${l.upgrade}` : ""}{l.qty > 1 ? ` ×${l.qty}` : ""}
                {l.fee > 0 && <span className="text-white/50"> · 🪙 {l.fee.toLocaleString(t.locale)}</span>}
                <span className="block text-[10px] text-white/40">{new Date(l.at).toLocaleString(t.locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Thumb({ image, rarity, qty, upgrade }: { image: string; rarity: string; qty: number; upgrade: number }) {
  return (
    <span className={`relative h-12 w-12 shrink-0 rounded-lg bg-black/40 ring-2 ${RARITY_STYLE[rarity] ?? RARITY_STYLE.common}`}>
      {image && <Image src={image} alt="" fill sizes="48px" className="object-contain p-0.5" />}
      {qty > 1 && <span className="absolute -right-1 -top-1 rounded-full bg-gold px-1.5 text-[10px] font-bold text-ink">x{qty}</span>}
      {upgrade > 0 && <span className="absolute -bottom-1 -left-1 rounded bg-gold px-1 font-display text-[10px] font-black text-ink">+{upgrade}</span>}
    </span>
  );
}

function Qty({ max, value, onChange, label }: { max: number; value: number; onChange: (n: number) => void; label: string }) {
  if (max <= 1) return null;
  return (
    <input type="number" min={1} max={max} value={value} aria-label={label}
      onChange={(e) => onChange(Math.max(1, Math.min(max, Math.floor(Number(e.target.value)) || 1)))} className="input !w-16 !px-2 !py-1 text-center text-xs" />
  );
}

function VaultRow({ v, busy, gold, locked, bagFull, onWithdraw }: { v: VaultItem; busy: boolean; gold: number; locked: boolean; bagFull: boolean; onWithdraw: (qty: number) => void }) {
  const t = useT();
  const [qty, setQty] = useState(1);
  const n = Math.min(qty, v.qty);
  const def = ITEM_BY_ID[v.itemId];
  const stats = def ? statText(t, upgradedStats(def.stats as Record<string, number>, v.upgrade)) : "";
  const fee = v.fee * n;
  const why = locked ? t("Aguarde o tempo mínimo de guilda") : bagFull ? t("Sua bolsa está cheia") : fee > gold ? t("Ouro insuficiente para a taxa") : "";
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg bg-black/30 p-2.5">
      <Thumb image={v.image} rarity={v.rarity} qty={v.qty} upgrade={v.upgrade} />
      <span className="min-w-[8rem] flex-1">
        <span className="block break-words font-display text-sm leading-tight">{t(v.name)}</span>
        <span className="block truncate text-[11px] text-white/50">{t(RARITY_LABEL[v.rarity] ?? "Comum")}{v.slot && SLOT_LABEL[v.slot] ? ` · ${t(SLOT_LABEL[v.slot])}` : ""}{stats ? ` · ${stats}` : ""}</span>
      </span>
      <span className="ml-auto flex items-center gap-1.5">
        <Qty max={v.qty} value={n} onChange={setQty} label={t("Quantidade")} />
        <button disabled={busy || !!why} title={why || t("Taxa de retirada: 🪙 {n}", { n: fee })} onClick={() => onWithdraw(n)}
          className="min-h-9 rounded-md bg-gold/90 px-3 text-xs font-bold text-ink hover:bg-gold disabled:cursor-not-allowed disabled:opacity-40">
          {t("Retirar")} 🪙{fee.toLocaleString(t.locale)}
        </button>
      </span>
    </li>
  );
}

function BagRow({ name, qty, upgrade, rarity, image, busy, blocked, onDeposit }: {
  name: string; qty: number; upgrade: number; rarity: string; image: string; busy: boolean; blocked: boolean; onDeposit: (qty: number) => void;
}) {
  const t = useT();
  const [n, setN] = useState(1);
  const amount = Math.min(n, qty);
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg bg-black/30 p-2.5">
      <Thumb image={image} rarity={rarity} qty={qty} upgrade={upgrade} />
      <span className="min-w-[8rem] flex-1 break-words font-display text-sm leading-tight">{t(name)}</span>
      <span className="ml-auto flex items-center gap-1.5">
        <Qty max={qty} value={amount} onChange={setN} label={t("Quantidade")} />
        <button disabled={busy || blocked} title={blocked ? t("O cofre está cheio") : undefined} onClick={() => onDeposit(amount)}
          className="min-h-9 rounded-md bg-white/10 px-3 text-xs hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40">{t("Guardar")}</button>
      </span>
    </li>
  );
}

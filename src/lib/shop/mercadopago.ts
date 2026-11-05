import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.mercadopago.com";

function token() {
  const t = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!t) throw new Error("MERCADOPAGO_ACCESS_TOKEN ausente");
  return t;
}

/** Cria uma preferência de Checkout Pro (Pix, cartão, boleto). */
export async function createMercadoPagoCheckout(args: {
  paymentId: string; userEmail?: string; name: string; amountCents: number; siteUrl: string;
}) {
  const res = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", "X-Idempotency-Key": args.paymentId },
    body: JSON.stringify({
      items: [{ id: args.paymentId, title: args.name, quantity: 1, currency_id: "BRL", unit_price: args.amountCents / 100 }],
      payer: args.userEmail ? { email: args.userEmail } : undefined,
      external_reference: args.paymentId,
      notification_url: `${args.siteUrl}/api/webhooks/mercadopago`,
      back_urls: {
        success: `${args.siteUrl}/jogo?pagamento=sucesso`,
        pending: `${args.siteUrl}/jogo?pagamento=pendente`,
        failure: `${args.siteUrl}/jogo?pagamento=cancelado`,
      },
      auto_return: "approved",
      statement_descriptor: "AETHELGARD",
    }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`mercadopago: ${data?.message ?? res.status}`);
  return { id: data.id as string, url: (data.init_point as string) };
}

/** Busca o pagamento direto na API (fonte da verdade — nunca confie só no corpo do webhook). */
export async function getMercadoPagoPayment(id: string) {
  const res = await fetch(`${API}/v1/payments/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token()}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`mercadopago payment ${res.status}`);
  return (await res.json()) as {
    id: number; status: string; external_reference: string; transaction_amount: number; currency_id: string;
  };
}

/**
 * Valida o header `x-signature` do Mercado Pago.
 * Manifesto: "id:{data.id};request-id:{x-request-id};ts:{ts};"
 */
export function verifyMercadoPagoSignature(args: {
  signature: string | null; requestId: string | null; dataId: string; secret?: string;
}): boolean {
  const secret = args.secret ?? process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!args.signature || !secret) return false;
  const parts = Object.fromEntries(args.signature.split(",").map((p) => p.trim().split("=") as [string, string]));
  if (!parts.ts || !parts.v1) return false;
  if (Math.abs(Date.now() - Number(parts.ts)) > 5 * 60 * 1000 && Math.abs(Date.now() / 1000 - Number(parts.ts)) > 300) return false;
  let manifest = `id:${args.dataId.toLowerCase()};`;
  if (args.requestId) manifest += `request-id:${args.requestId};`;
  manifest += `ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  return parts.v1.length === expected.length && timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected));
}

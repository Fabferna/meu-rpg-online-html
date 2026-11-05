import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Integração via REST (sem SDK) — menos dependências, mesmo resultado.
const API = "https://api.stripe.com/v1";

function key() {
  const k = process.env.STRIPE_SECRET_KEY;
  if (!k) throw new Error("STRIPE_SECRET_KEY ausente");
  return k;
}

function form(obj: Record<string, string | number>) {
  return new URLSearchParams(Object.entries(obj).map(([k, v]) => [k, String(v)])).toString();
}

export async function createStripeCheckout(args: {
  paymentId: string; userEmail?: string; name: string; amountCents: number; currency: "BRL" | "USD"; siteUrl: string;
}) {
  const body: Record<string, string | number> = {
    mode: "payment",
    "line_items[0][quantity]": 1,
    "line_items[0][price_data][currency]": args.currency.toLowerCase(),
    "line_items[0][price_data][unit_amount]": args.amountCents,
    "line_items[0][price_data][product_data][name]": args.name,
    client_reference_id: args.paymentId,
    "metadata[payment_id]": args.paymentId,
    "payment_intent_data[metadata][payment_id]": args.paymentId,
    success_url: `${args.siteUrl}/jogo?pagamento=sucesso`,
    cancel_url: `${args.siteUrl}/jogo?pagamento=cancelado`,
  };
  if (args.userEmail) body.customer_email = args.userEmail;
  if (args.currency === "BRL") {
    // Cartão + Pix/Boleto ficam a cargo dos métodos ativados no painel Stripe.
    body["payment_method_types[0]"] = "card";
  }

  const res = await fetch(`${API}/checkout/sessions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": args.paymentId },
    body: form(body),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`stripe: ${data?.error?.message ?? res.status}`);
  return { id: data.id as string, url: data.url as string };
}

/**
 * Verifica o header `Stripe-Signature` (HMAC-SHA256 de "t.payload").
 * Rejeita assinaturas com mais de 5 minutos (replay attack).
 */
export function verifyStripeSignature(payload: string, header: string | null, secret = process.env.STRIPE_WEBHOOK_SECRET): boolean {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  return sigs.some((s) => s.length === expected.length && timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
}

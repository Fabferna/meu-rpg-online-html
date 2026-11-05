import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyStripeSignature } from "@/lib/shop/stripe";

export const dynamic = "force-dynamic";

// Configure no painel Stripe → Developers → Webhooks:
//   URL: https://SEU-DOMINIO/api/webhooks/stripe
//   Eventos: checkout.session.completed, checkout.session.async_payment_succeeded, charge.refunded, charge.dispute.created
export async function POST(request: Request) {
  const payload = await request.text(); // corpo CRU (necessário para a assinatura)
  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"))) {
    return new NextResponse("invalid signature", { status: 400 });
  }
  const event = JSON.parse(payload);
  const admin = createAdminClient();
  const obj = event.data?.object ?? {};

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        if (obj.payment_status !== "paid") break; // ex.: boleto ainda pendente
        const paymentId = obj.metadata?.payment_id ?? obj.client_reference_id;
        const { error } = await admin.rpc("fulfill_payment", {
          p_payment: paymentId, p_provider_payment_id: obj.payment_intent, p_amount_cents: obj.amount_total, p_currency: obj.currency,
        });
        if (error) throw error;
        break;
      }
      case "charge.refunded":
      case "charge.dispute.created": {
        const pi = event.type === "charge.refunded" ? obj.payment_intent : obj.payment_intent;
        if (pi) await admin.rpc("refund_payment", { p_provider_payment_id: pi });
        break;
      }
    }
  } catch (err) {
    console.error("[stripe webhook]", event.type, err);
    // 500 => o Stripe reenvia automaticamente.
    return new NextResponse("error", { status: 500 });
  }
  return NextResponse.json({ received: true });
}

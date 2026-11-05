import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMercadoPagoPayment, verifyMercadoPagoSignature } from "@/lib/shop/mercadopago";

export const dynamic = "force-dynamic";

// Configure em Mercado Pago → Suas integrações → Webhooks:
//   URL: https://SEU-DOMINIO/api/webhooks/mercadopago  · Evento: Pagamentos
export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const dataId = String(url.searchParams.get("data.id") ?? body?.data?.id ?? "");
  const type = url.searchParams.get("type") ?? body?.type;
  if (!dataId) return NextResponse.json({ ignored: true });

  if (!verifyMercadoPagoSignature({ signature: request.headers.get("x-signature"), requestId: request.headers.get("x-request-id"), dataId })) {
    return new NextResponse("invalid signature", { status: 400 });
  }
  if (type !== "payment") return NextResponse.json({ ignored: true });

  try {
    // Nunca confiar no corpo: consultamos o pagamento na API oficial.
    const mp = await getMercadoPagoPayment(dataId);
    const admin = createAdminClient();
    if (mp.status === "approved") {
      const { error } = await admin.rpc("fulfill_payment", {
        p_payment: mp.external_reference, p_provider_payment_id: `mp_${mp.id}`,
        p_amount_cents: Math.round(mp.transaction_amount * 100), p_currency: mp.currency_id,
      });
      if (error && !/payment_not_pending/.test(error.message)) throw error;
    } else if (mp.status === "refunded" || mp.status === "charged_back") {
      await admin.rpc("refund_payment", { p_provider_payment_id: `mp_${mp.id}` });
    }
  } catch (err) {
    console.error("[mercadopago webhook]", err);
    return new NextResponse("error", { status: 500 });
  }
  return NextResponse.json({ received: true });
}

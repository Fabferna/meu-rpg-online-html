import { z } from "zod";
import { action, HttpError, rpc } from "@/lib/api";
import { enabledProviders } from "@/lib/shop/server";

// SOMENTE DESENVOLVIMENTO: simula o webhook de pagamento aprovado.
// Desligado em produção (NODE_ENV=production) e sem PAYMENTS_DEV=1.
export const POST = action("dev-pay", z.object({ paymentId: z.uuid() }).strict(), async ({ user, body, admin }) => {
  if (!enabledProviders().dev) throw new HttpError(404, "not_found");
  const { data: p } = await admin.from("payments").select("*").eq("id", body.paymentId).eq("user_id", user.id).eq("provider", "dev").single();
  if (!p) throw new HttpError(404, "unknown_payment");
  return rpc(admin, "fulfill_payment", { p_payment: p.id, p_provider_payment_id: `dev_${p.id}`, p_amount_cents: p.amount_cents, p_currency: p.currency });
});

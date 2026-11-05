import { z } from "zod";
import { action, HttpError } from "@/lib/api";
import { PACK_BY_ID, providersFor } from "@/lib/shop/catalog";
import { createStripeCheckout } from "@/lib/shop/stripe";
import { createMercadoPagoCheckout } from "@/lib/shop/mercadopago";
import { enabledProviders, siteUrl } from "@/lib/shop/server";

const Schema = z.object({
  productId: z.string().max(32),
  currency: z.enum(["BRL", "USD"]),
  provider: z.enum(["stripe", "mercadopago", "dev"]),
}).strict();

// Cria um pagamento PENDENTE e devolve a URL do checkout hospedado do gateway.
// O preço vem do catálogo do servidor — o cliente só escolhe o produto.
export const POST = action("checkout", Schema, async ({ user, body, admin }) => {
  const pack = PACK_BY_ID[body.productId];
  if (!pack) throw new HttpError(404, "unknown_product");

  const enabled = enabledProviders();
  if (body.provider === "dev" ? !enabled.dev : !enabled[body.provider] || !providersFor(body.currency).includes(body.provider)) {
    throw new HttpError(400, "provider_unavailable");
  }

  if (pack.oncePerAccount) {
    const { count } = await admin.from("payments").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).eq("product_id", pack.id).eq("status", "paid");
    if (count) throw new HttpError(409, "already_owned");
  }

  const amount = pack.price[body.currency];
  const { data: pay, error } = await admin.from("payments")
    .insert({ user_id: user.id, provider: body.provider, product_id: pack.id, currency: body.currency, amount_cents: amount, gems: pack.gems })
    .select("id").single();
  if (error) throw error;

  const name = `${pack.name} — ${pack.gems} gemas`;
  let checkout: { id: string; url: string };
  if (body.provider === "stripe") {
    checkout = await createStripeCheckout({ paymentId: pay.id, userEmail: user.email, name, amountCents: amount, currency: body.currency, siteUrl: siteUrl() });
  } else if (body.provider === "mercadopago") {
    checkout = await createMercadoPagoCheckout({ paymentId: pay.id, userEmail: user.email, name, amountCents: amount, siteUrl: siteUrl() });
  } else {
    checkout = { id: `dev_${pay.id}`, url: `/jogo?pagamento=dev&id=${pay.id}` };
  }

  await admin.from("payments").update({ checkout_ref: checkout.id }).eq("id", pay.id);
  return { url: checkout.url, paymentId: pay.id };
}, { max: 10, windowSec: 60 });

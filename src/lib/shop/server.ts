import "server-only";

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function enabledProviders() {
  return {
    stripe: !!process.env.STRIPE_SECRET_KEY,
    mercadopago: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
    dev: process.env.NODE_ENV !== "production" && process.env.PAYMENTS_DEV === "1",
  };
}

export function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

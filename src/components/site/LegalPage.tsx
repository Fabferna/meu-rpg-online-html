import Link from "next/link";
import { SITE } from "@/lib/site";
import { getT } from "@/lib/i18n/server";

export default async function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  const t = await getT();
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="font-display text-gold">← {SITE.name}</Link>
      <h1 className="mt-6 font-display text-3xl text-gold">{title}</h1>
      <p className="mt-1 text-sm text-white/50">{t("Última atualização:")} {t(SITE.updatedAt)}</p>
      <article className="legal mt-8 space-y-4 leading-relaxed text-white/80">{children}</article>
      <SiteFooter />
    </main>
  );
}

export async function SiteFooter() {
  const t = await getT();
  return (
    <footer className="mt-16 flex flex-wrap justify-center gap-4 border-t border-white/10 pt-6 text-xs text-white/50">
      <span>© {new Date().getFullYear()} {SITE.name}</span>
      <Link href="/termos" className="hover:text-white">{t("Termos de Uso")}</Link>
      <Link href="/privacidade" className="hover:text-white">{t("Política de Privacidade")}</Link>
      <span>Contato: {SITE.contactEmail}</span>
    </footer>
  );
}

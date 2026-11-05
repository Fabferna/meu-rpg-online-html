import type { Metadata, Viewport } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import { loadDict } from "@/lib/i18n/dicts";
import { LANG_INFO } from "@/lib/i18n/config";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://meu-rpg-online-html.vercel.app";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    metadataBase: new URL(siteUrl),
    title: { default: "Aethelgard Online", template: "%s" },
    description: t("RPG de navegador grátis: crie seu herói, cumpra missões, cace monstros e suba no ranking da Arena PVP."),
    applicationName: "Aethelgard Online",
    keywords: ["rpg online", "jogo de navegador", "rpg grátis", "juego rpg", "rpg 网页游戏", "pvp", "aethelgard"],
    icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
    appleWebApp: { capable: true, title: "Aethelgard", statusBarStyle: "black-translucent" },
    openGraph: {
      type: "website", locale: LANG_INFO[t.lang].ogLocale, siteName: "Aethelgard Online", url: "/",
      title: `Aethelgard Online — ${t("RPG de navegador")}`,
      description: t("Crie seu herói, cumpra missões, cace monstros e enfrente outros jogadores na Arena."),
      images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Aethelgard Online" }],
    },
    twitter: { card: "summary_large_image", images: ["/og.jpg"] },
  };
}

export const viewport: Viewport = { themeColor: "#0d0b14" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  const dict = await loadDict(lang);
  return (
    <html lang={LANG_INFO[lang].html}>
      <body>
        <I18nProvider lang={lang} dict={dict}>{children}</I18nProvider>
      </body>
    </html>
  );
}

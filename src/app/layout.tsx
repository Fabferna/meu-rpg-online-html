import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://meu-rpg-online-html.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Aethelgard Online", template: "%s" },
  description: "RPG de navegador grátis: crie seu herói, cumpra missões, cace monstros e suba no ranking da Arena PVP.",
  applicationName: "Aethelgard Online",
  keywords: ["rpg online", "jogo de navegador", "rpg grátis", "pvp", "aethelgard"],
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Aethelgard", statusBarStyle: "black-translucent" },
  openGraph: {
    type: "website", locale: "pt_BR", siteName: "Aethelgard Online", url: "/",
    title: "Aethelgard Online — RPG de navegador",
    description: "Crie seu herói, cumpra missões, cace monstros e enfrente outros jogadores na Arena.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Aethelgard Online" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.jpg"] },
};

export const viewport: Viewport = { themeColor: "#0d0b14" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

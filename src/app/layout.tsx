import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aethelgard Online",
  description: "RPG de navegador: missões, combates PVE/PVP e evolução do seu herói em Aethelgard.",
  icons: { icon: "/assets/loader.webp" },
};

export const viewport: Viewport = { themeColor: "#0d0b14" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

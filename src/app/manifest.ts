import type { MetadataRoute } from "next";

// Permite "Adicionar à tela inicial" / instalar como app no celular e no PC.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aethelgard Online",
    short_name: "Aethelgard",
    description: "RPG de navegador: missões, caçadas e arena PVP.",
    start_url: "/jogo",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d0b14",
    theme_color: "#0d0b14",
    lang: "pt-BR",
    categories: ["games"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

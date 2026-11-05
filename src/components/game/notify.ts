"use client";
import { useEffect } from "react";

// Aviso de "missão concluída": notificação do navegador (se permitida)
// e o título da aba piscando. Tudo local — o servidor continua sendo a
// fonte da verdade do horário de término.

export function askNotificationPermission() {
  try {
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
  } catch { /* sem suporte */ }
}

export function useQuestAlerts(endsAt: string | null, skew: number) {
  useEffect(() => {
    if (!endsAt) return;
    const base = document.title.replace(/^\(.*?\)\s*/, "");
    const ms = new Date(endsAt).getTime() - (Date.now() + skew);
    let blink: ReturnType<typeof setInterval> | undefined;

    const fire = () => {
      document.title = `(✔) Missão concluída! · ${base}`;
      let on = true;
      blink = setInterval(() => { document.title = on ? `(✔) Missão concluída! · ${base}` : base; on = !on; }, 1500);
      try {
        if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
          const n = new Notification("Missão concluída! 📜", { body: "Volte para receber sua recompensa em Aethelgard.", icon: "/assets/loader.webp", tag: "quest" });
          n.onclick = () => { window.focus(); n.close(); };
        }
      } catch { /* sem suporte */ }
    };

    const t = ms <= 0 ? (fire(), undefined) : setTimeout(fire, ms);
    const stop = () => { if (!document.hidden && blink) { clearInterval(blink); blink = undefined; document.title = `(✔) ${base}`; } };
    document.addEventListener("visibilitychange", stop);
    return () => {
      if (t) clearTimeout(t);
      if (blink) clearInterval(blink);
      document.removeEventListener("visibilitychange", stop);
      document.title = base;
    };
  }, [endsAt, skew]);
}

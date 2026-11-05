"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LanguageSwitcher, useT } from "@/lib/i18n/client";

type Mode = "login" | "registro";

export default function LoginForm() {
  const t = useT();
  const params = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(params.get("modo") === "registro" ? "registro" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "ok"; text: string } | null>(
    params.get("error") ? { kind: "error", text: t("Não foi possível autenticar. Tente novamente.") } : null,
  );

  const rawNext = params.get("next") ?? "";
  const next = /^\/(?![/\\])/.test(rawNext) ? rawNext : "/jogo"; // evita open-redirect
  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = useMemo(() => (configured ? createClient() : null), [configured]);
  const redirectTo = () =>
    `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next);
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } });
        if (error) throw error;
        setMsg({ kind: "ok", text: t("Conta criada! Confira seu e-mail para confirmar o cadastro.") });
      }
    } catch (err) {
      const text = err instanceof Error ? translate(err.message) : "Erro inesperado.";
      setMsg({ kind: "error", text });
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider: "google" | "facebook") {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: redirectTo() } });
    if (error) {
      setMsg({ kind: "error", text: translate(error.message) });
      setBusy(false);
    }
  }

  return (
    <div className="panel w-full max-w-md p-8 fade-up">
      <div className="mb-4 flex justify-center"><LanguageSwitcher /></div>
      <Link href="/" className="block text-center font-display text-2xl font-black text-gold">{t("Aethelgard")}</Link>
      <div className="mt-6 grid grid-cols-2 rounded-lg bg-black/40 p-1 text-sm">
        {(["login", "registro"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setMsg(null); }}
            className={`rounded-md py-2 font-display transition ${mode === m ? "bg-gold text-ink" : "text-white/70 hover:text-white"}`}
          >
            {m === "login" ? t("Entrar") : t("Registrar")}
          </button>
        ))}
      </div>

      {!configured && (
        <p className="mt-4 rounded-md bg-amber-500/15 px-3 py-2 text-sm text-amber-200">
          {t("O login ainda não está ativo neste servidor. Enquanto isso,")} <Link href="/demo" className="underline">{t("veja a demonstração")}</Link>.
        </p>
      )}
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-white/70">{t("E-mail")}</span>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-white/70">{t("Senha")}</span>
          <input
            className="input"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {msg && (
          <p role="alert" className={`rounded-md px-3 py-2 text-sm ${msg.kind === "error" ? "bg-life/20 text-red-200" : "bg-emerald-500/15 text-emerald-200"}`}>
            {t(msg.text)}
          </p>
        )}
        <button className="btn-gold w-full" disabled={busy}>
          {busy ? "Aguarde…" : mode === "login" ? "Adentrar o Reino" : "Criar minha lenda"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-white/40">
        <span className="h-px flex-1 bg-white/10" /> {t("ou continue com")} <span className="h-px flex-1 bg-white/10" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" disabled={busy} onClick={() => oauth("google")} className="rounded-lg border border-white/15 bg-white py-2.5 font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-60">
          {t("Google")}
        </button>
        <button type="button" disabled={busy} onClick={() => oauth("facebook")} className="rounded-lg bg-[#1877f2] py-2.5 font-medium text-white hover:brightness-110 disabled:opacity-60">
          {t("Facebook")}
        </button>
      </div>
      <p className="mt-6 text-center text-[11px] text-white/40">
        {t("Ao continuar, você concorda com os")} <Link href="/termos" className="underline">{t("Termos de Uso")}</Link> e a{" "}
        <Link href="/privacidade" className="underline">{t("Política de Privacidade")}</Link>.
      </p>
    </div>
  );
}

function translate(message: string): string {
  // Devolve a mensagem em português; quem exibe passa por t().
  if (/invalid login credentials/i.test(message)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(message)) return "Confirme seu e-mail antes de entrar.";
  if (/already registered/i.test(message)) return "Este e-mail já está cadastrado.";
  if (/password/i.test(message)) return "A senha deve ter pelo menos 8 caracteres.";
  if (/rate limit/i.test(message)) return "Muitas tentativas. Aguarde um pouco.";
  return message;
}

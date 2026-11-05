import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import AdminPanel from "./AdminPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Moderação — Aethelgard Online", robots: { index: false } };

// Painel só existe para administradores; para os demais, 404.
export default async function AdminPage() {
  const { user } = await getUser();
  if (!user || !(await isAdmin(user.id))) notFound();
  const admin = createAdminClient();

  const { data: reports } = await admin.from("chat_reports").select("message_id, reason, created_at").eq("resolved", false).order("created_at", { ascending: false }).limit(200);
  const ids = [...new Set((reports ?? []).map((r) => r.message_id))];
  const { data: msgs } = ids.length ? await admin.from("chat_messages").select("id, name, body, channel, hidden, created_at").in("id", ids) : { data: [] };
  const items = (msgs ?? []).map((m) => {
    const rs = (reports ?? []).filter((r) => r.message_id === m.id);
    return { ...m, count: rs.length, reasons: [...new Set(rs.map((r) => r.reason))] };
  }).sort((a, b) => b.count - a.count);

  const { data: flagged } = await admin.from("profiles").select("id, is_banned, muted_until").or(`is_banned.eq.true,muted_until.gt.${new Date().toISOString()}`).limit(100);
  const { data: names } = flagged?.length ? await admin.from("characters").select("user_id, name").in("user_id", flagged.map((f) => f.id)) : { data: [] };
  const players = (flagged ?? []).map((f) => ({ name: (names ?? []).find((n) => n.user_id === f.id)?.name ?? "(sem herói)", banned: f.is_banned, mutedUntil: f.muted_until }));

  return <AdminPanel reports={items} players={players} />;
}

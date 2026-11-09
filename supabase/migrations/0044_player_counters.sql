-- 0044: Contadores de jogadores em tempo real.
--   • "Jogadores Registrados": total de contas criadas (public.profiles).
--   • "Jogadores Online": contas cujo jogo deu sinal de vida nos últimos minutos (player_presence).
-- O jogo (/jogo) manda um "batimento" por minuto; quem fecha a aba some da contagem sozinho.
-- Pode rodar mais de uma vez sem problema.

create table if not exists public.player_presence (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  last_seen  timestamptz not null default now()
);
create index if not exists player_presence_seen_idx on public.player_presence (last_seen desc);

-- Ninguém lê nem escreve direto: só o servidor, pelas funções abaixo.
alter table public.player_presence enable row level security;
revoke all on public.player_presence from anon, authenticated;

-- Batimento: marca o jogador como online agora.
create or replace function public.presence_ping(p_user uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.player_presence (user_id, last_seen) values (p_user, now())
    on conflict (user_id) do update set last_seen = now();
$$;

-- Números públicos (só totais, nenhum dado de jogador).
create or replace function public.player_counters(p_window_sec int default 180) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'registered', (select count(*) from public.profiles),
    'online',     (select count(*) from public.player_presence
                    where last_seen > now() - make_interval(secs => greatest(30, least(coalesce(p_window_sec, 180), 3600))))
  );
$$;

revoke execute on function public.presence_ping(uuid) from public, anon, authenticated;
revoke execute on function public.player_counters(int) from public, anon, authenticated;
grant execute on function public.presence_ping(uuid) to service_role;
grant execute on function public.player_counters(int) to service_role;

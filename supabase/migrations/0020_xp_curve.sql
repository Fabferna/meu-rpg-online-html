-- 0020: nova curva de XP por nível (espelho de xpForNextLevel em src/lib/game/rules.ts).
-- Antes: 50 + 25×(nível−1) → do 1 ao 40 bastavam ~20 mil XP, e só a história dava 49 mil.
-- Agora: 50 + 12 × nível^2,7 → primeiros níveis rápidos, fim do jogo bem mais longo.
-- Heróis existentes mantêm o nível e o XP que já têm (ninguém perde nível).
create or replace function public.f_xp_next(p_level int) returns int
language sql immutable as $$ select round(50 + 12 * power(p_level::numeric, 2.7))::int $$;

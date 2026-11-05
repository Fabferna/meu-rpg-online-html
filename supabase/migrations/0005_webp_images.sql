-- Imagens convertidas de PNG para WebP (97 MB -> 5 MB).
-- Atualiza caminhos gravados no banco (itens e estado de batalhas antigas).
update public.items set data = jsonb_set(data, '{image}', to_jsonb(replace(data->>'image', '.png', '.webp')))
  where data->>'image' like '%.png';
update public.battles set state = jsonb_set(state, '{enemy,image}', to_jsonb(replace(state#>>'{enemy,image}', '.png', '.webp')))
  where status = 'active' and state#>>'{enemy,image}' like '%.png';

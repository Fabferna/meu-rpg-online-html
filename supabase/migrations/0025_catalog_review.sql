-- 0025: revisão do catálogo, venda em lote e limite da bolsa nas compras.
--
-- • 18 equipamentos novos (lacunas: botas médias, armadura leve lendária, armas lendárias para
--   elfo/anão/gronar/aetheliano, itens raros/épicos para os níveis 18–34 e Ferreiro até o nível 22).
-- • Ajustes de poder: Anel do Vigor (CON 3 → CON 4 + DEF 1) e Tiara Lunar (DEF 2/INT 4 → DEF 3/INT 5).
--   Itens que os jogadores já têm recebem os novos atributos automaticamente (vêm da tabela items).
-- • sell_many: vende vários itens de uma vez, numa transação só, com uma linha no extrato por item.
-- A tabela items abaixo é gerada por scripts/gen-items-sql.ts (espelho de src/lib/game/items.ts).

insert into public.items (id, name, kind, rarity, data) values
  ('pocao_vida', 'Poção de Vida', 'consumable', 'common', '{"heal":60,"image":"/assets/shop/potion_hp.webp"}'),
  ('espada_curta', 'Espada Curta Funcional', 'weapon', 'common', '{"slot":"weapon","atk":4,"image":"/assets/espada_curta_funcional.webp"}'),
  ('machado_bronze', 'Machado de Bronze', 'weapon', 'common', '{"slot":"weapon","atk":5,"str":1,"image":"/assets/items/machado_bronze-v2.webp"}'),
  ('arco_elfico', 'Arco Élfico Elegante', 'weapon', 'rare', '{"slot":"weapon","atk":7,"dex":2,"image":"/assets/arco_elfico_elegante.webp"}'),
  ('cajado_luminoso', 'Cajado Mágico Luminoso', 'weapon', 'rare', '{"slot":"weapon","atk":3,"intel":4,"image":"/assets/cajado_magico_luminoso.webp"}'),
  ('lamina_valerion', 'Lâmina de Valerion', 'weapon', 'rare', '{"slot":"weapon","atk":9,"dex":1,"image":"/assets/items/lamina_valerion-v2.webp"}'),
  ('martelo_guerra', 'Martelo de Guerra', 'weapon', 'rare', '{"slot":"weapon","atk":8,"str":1,"image":"/assets/items/martelo_guerra.webp"}'),
  ('machado_guerra', 'Machado de Guerra', 'weapon', 'rare', '{"slot":"weapon","atk":10,"str":2,"image":"/assets/items/machado_guerra.webp"}'),
  ('cajado_carvalho', 'Cajado de Carvalho Rúnico', 'weapon', 'rare', '{"slot":"weapon","atk":4,"intel":7,"image":"/assets/items/cajado_carvalho.webp"}'),
  ('arco_longo', 'Arco Longo de Teixo', 'weapon', 'rare', '{"slot":"weapon","atk":11,"dex":3,"image":"/assets/items/arco_longo.webp"}'),
  ('martelo_forja', 'Martelo da Forja Ancestral', 'weapon', 'epic', '{"slot":"weapon","atk":11,"str":2,"image":"/assets/icone_forja_ancestral.webp"}'),
  ('arco_lunar', 'Arco Lunar', 'weapon', 'epic', '{"slot":"weapon","atk":13,"dex":4,"image":"/assets/items/arco_lunar-v2.webp"}'),
  ('espada_capitao', 'Espada do Capitão', 'weapon', 'epic', '{"slot":"weapon","atk":15,"str":2,"dex":1,"image":"/assets/items/espada_capitao.webp"}'),
  ('cajado_eter', 'Cajado do Éter', 'weapon', 'epic', '{"slot":"weapon","atk":6,"intel":10,"image":"/assets/items/cajado_eter-v2.webp"}'),
  ('machado_escarlate', 'Machado Escarlate', 'weapon', 'epic', '{"slot":"weapon","atk":17,"str":3,"image":"/assets/items/machado_escarlate-v2.webp"}'),
  ('lamina_aurora', 'Lâmina da Aurora', 'weapon', 'legendary', '{"slot":"weapon","atk":22,"str":3,"dex":3,"image":"/assets/items/lamina_aurora-v2.webp"}'),
  ('tridente_meria', 'Tridente de Meria', 'weapon', 'legendary', '{"slot":"weapon","atk":20,"intel":8,"image":"/assets/items/tridente_meria-v2.webp"}'),
  ('arco_tempestade', 'Arco da Tempestade', 'weapon', 'legendary', '{"slot":"weapon","atk":21,"dex":6,"image":"/assets/items/arco_tempestade.webp"}'),
  ('martelo_trovao', 'Martelo do Trovão Rúnico', 'weapon', 'legendary', '{"slot":"weapon","atk":23,"str":4,"con":2,"image":"/assets/items/martelo_trovao.webp"}'),
  ('machado_colosso', 'Machado do Colosso', 'weapon', 'legendary', '{"slot":"weapon","atk":25,"str":4,"image":"/assets/items/machado_colosso.webp"}'),
  ('cajado_astral', 'Cajado Astral', 'weapon', 'legendary', '{"slot":"weapon","atk":10,"intel":14,"image":"/assets/items/cajado_astral.webp"}'),
  ('capuz_viajante', 'Capuz do Viajante', 'armor', 'common', '{"slot":"helmet","def":1,"dex":1,"image":"/assets/items/capuz_viajante-v2.webp"}'),
  ('elmo_ferro', 'Elmo de Ferro', 'armor', 'rare', '{"slot":"helmet","def":3,"con":1,"image":"/assets/items/elmo_ferro-v2.webp"}'),
  ('tiara_lunar', 'Tiara Lunar', 'armor', 'epic', '{"slot":"helmet","def":3,"intel":5,"image":"/assets/items/tiara_lunar-v2.webp"}'),
  ('capuz_sentinela', 'Capuz da Sentinela', 'armor', 'rare', '{"slot":"helmet","def":3,"dex":2,"intel":1,"image":"/assets/items/capuz_sentinela.webp"}'),
  ('coroa_vorlag', 'Coroa de Vorlag', 'armor', 'legendary', '{"slot":"helmet","def":5,"atk":3,"intel":3,"image":"/assets/items/coroa_vorlag-v2.webp"}'),
  ('elmo_estelar', 'Elmo de Aço Estelar', 'armor', 'epic', '{"slot":"helmet","def":7,"con":3,"image":"/assets/items/elmo_estelar.webp"}'),
  ('gibao_couro', 'Gibão de Couro', 'armor', 'common', '{"slot":"armor","def":3,"image":"/assets/items/gibao_couro-v2.webp"}'),
  ('cota_malha', 'Cota de Malha', 'armor', 'rare', '{"slot":"armor","def":6,"con":1,"image":"/assets/items/cota_malha-v2.webp"}'),
  ('peitoral_anao', 'Peitoral de Placas Anão', 'armor', 'epic', '{"slot":"armor","def":8,"con":2,"image":"/assets/peitoral_de_placas_anao.webp"}'),
  ('manto_arcano', 'Manto Arcano', 'armor', 'epic', '{"slot":"armor","def":6,"intel":5,"image":"/assets/items/manto_arcano-v2.webp"}'),
  ('couraca_escamas', 'Couraça de Escamas', 'armor', 'rare', '{"slot":"armor","def":10,"con":2,"image":"/assets/items/couraca_escamas.webp"}'),
  ('armadura_celeste', 'Armadura Celeste', 'armor', 'legendary', '{"slot":"armor","def":16,"con":4,"image":"/assets/items/armadura_celeste-v2.webp"}'),
  ('veste_lunar', 'Veste Lunar das Sombras', 'armor', 'legendary', '{"slot":"armor","def":11,"dex":5,"intel":4,"image":"/assets/items/veste_lunar.webp"}'),
  ('botas_couro', 'Botas de Couro', 'armor', 'common', '{"slot":"boots","dex":1,"def":1,"image":"/assets/items/botas_couro-v2.webp"}'),
  ('botas_patrulheiro', 'Botas do Patrulheiro', 'armor', 'rare', '{"slot":"boots","dex":3,"def":1,"image":"/assets/items/botas_patrulheiro-v2.webp"}'),
  ('botas_cavaleiro', 'Botas de Cavaleiro', 'armor', 'rare', '{"slot":"boots","def":2,"con":1,"str":1,"image":"/assets/items/botas_cavaleiro.webp"}'),
  ('grevas_runicas', 'Grevas Rúnicas', 'armor', 'epic', '{"slot":"boots","def":4,"dex":2,"image":"/assets/items/grevas_runicas-v2.webp"}'),
  ('botas_vento', 'Botas do Vento Celeste', 'armor', 'legendary', '{"slot":"boots","dex":7,"def":3,"image":"/assets/items/botas_vento-v2.webp"}'),
  ('botas_guardiao', 'Botas do Guardião', 'armor', 'epic', '{"slot":"boots","def":5,"con":2,"dex":2,"image":"/assets/items/botas_guardiao.webp"}'),
  ('grevas_eter', 'Grevas de Éter', 'armor', 'epic', '{"slot":"boots","def":7,"con":3,"image":"/assets/items/grevas_eter.webp"}'),
  ('anel_vigor', 'Anel do Vigor', 'accessory', 'rare', '{"slot":"accessory","con":4,"def":1,"image":"/assets/items/anel_vigor-v2.webp"}'),
  ('estandarte_inspirador', 'Estandarte Inspirador', 'accessory', 'rare', '{"slot":"accessory","atk":2,"con":2,"image":"/assets/estandarte_inspirador.webp"}'),
  ('foco_arcano', 'Foco de Canalização Arcana', 'accessory', 'epic', '{"slot":"accessory","intel":6,"def":1,"image":"/assets/canalizacao_de_magia.webp"}'),
  ('amuleto_serpente', 'Amuleto da Serpente Sinistra', 'accessory', 'legendary', '{"slot":"accessory","atk":4,"def":3,"intel":3,"image":"/assets/amuleto_da_serpente_sinistra.webp"}'),
  ('anel_tempestade', 'Anel da Tempestade', 'accessory', 'rare', '{"slot":"accessory","atk":2,"dex":3,"image":"/assets/items/anel_tempestade.webp"}'),
  ('talisma_estelar', 'Talismã Estelar', 'accessory', 'epic', '{"slot":"accessory","intel":6,"con":3,"def":2,"image":"/assets/items/talisma_estelar.webp"}'),
  ('olho_vazio', 'Olho do Vazio', 'accessory', 'legendary', '{"slot":"accessory","atk":6,"def":4,"intel":6,"str":2,"image":"/assets/items/olho_vazio-v2.webp"}')
on conflict (id) do update set name = excluded.name, kind = excluded.kind, rarity = excluded.rarity, data = excluded.data;

-- Vende vários itens (inteiros, inclusive pilhas) de uma vez. p_sales = [{id, price}] com o preço
-- de venda POR UNIDADE calculado no servidor (items.ts). Tudo ou nada.
create or replace function public.sell_many(p_user uuid, p_sales jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare e jsonb; inv public.inventory; v_price int; v_total bigint := 0; v_n int := 0;
begin
  if p_sales is null or jsonb_typeof(p_sales) <> 'array' or jsonb_array_length(p_sales) = 0 or jsonb_array_length(p_sales) > 60 then
    raise exception 'invalid_sale';
  end if;
  for e in select * from jsonb_array_elements(p_sales) loop
    v_price := (e->>'price')::int;
    if v_price is null or v_price <= 0 or v_price > 100000 then raise exception 'invalid_cost'; end if;
    select * into inv from public.inventory where id = (e->>'id')::uuid and user_id = p_user for update;
    if not found then raise exception 'not_owner'; end if;
    if inv.equipped then raise exception 'item_equipped'; end if;
    delete from public.inventory where id = inv.id;
    perform public.wallet_apply(p_user, 'gold', v_price * inv.qty, 'smith:sell:' || inv.item_id);
    v_total := v_total + v_price * inv.qty;
    v_n := v_n + inv.qty;
  end loop;
  return jsonb_build_object('gold', v_total, 'count', v_n);
end;
$$;

revoke execute on function public.sell_many(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.sell_many(uuid, jsonb) to service_role;

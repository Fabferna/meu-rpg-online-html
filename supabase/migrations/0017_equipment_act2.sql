-- 0017: revisão de equipamentos (5 espaços: arma, elmo, armadura, botas, acessório),
-- novos itens do Ato II. Gerado por scripts/gen-items-sql.ts a partir de src/lib/game/items.ts.
-- Elmos e botas usam kind 'armor' no catálogo; o espaço real fica em data.slot / inventory.slot.

insert into public.items (id, name, kind, rarity, data) values
  ('pocao_vida', 'Poção de Vida', 'consumable', 'common', '{"heal":60,"image":"/assets/shop/potion_hp.webp"}'),
  ('espada_curta', 'Espada Curta Funcional', 'weapon', 'common', '{"slot":"weapon","atk":4,"image":"/assets/espada_curta_funcional.webp"}'),
  ('machado_bronze', 'Machado de Bronze', 'weapon', 'common', '{"slot":"weapon","atk":5,"str":1,"image":"/assets/items/machado_bronze.webp"}'),
  ('arco_elfico', 'Arco Élfico Elegante', 'weapon', 'rare', '{"slot":"weapon","atk":7,"dex":2,"image":"/assets/arco_elfico_elegante.webp"}'),
  ('cajado_luminoso', 'Cajado Mágico Luminoso', 'weapon', 'rare', '{"slot":"weapon","atk":3,"intel":4,"image":"/assets/cajado_magico_luminoso.webp"}'),
  ('lamina_valerion', 'Lâmina de Valerion', 'weapon', 'rare', '{"slot":"weapon","atk":9,"dex":1,"image":"/assets/items/lamina_valerion.webp"}'),
  ('martelo_forja', 'Martelo da Forja Ancestral', 'weapon', 'epic', '{"slot":"weapon","atk":11,"str":2,"image":"/assets/icone_forja_ancestral.webp"}'),
  ('arco_lunar', 'Arco Lunar', 'weapon', 'epic', '{"slot":"weapon","atk":13,"dex":4,"image":"/assets/items/arco_lunar.webp"}'),
  ('cajado_eter', 'Cajado do Éter', 'weapon', 'epic', '{"slot":"weapon","atk":6,"intel":10,"image":"/assets/items/cajado_eter.webp"}'),
  ('machado_escarlate', 'Machado Escarlate', 'weapon', 'epic', '{"slot":"weapon","atk":17,"str":3,"image":"/assets/items/machado_escarlate.webp"}'),
  ('lamina_aurora', 'Lâmina da Aurora', 'weapon', 'legendary', '{"slot":"weapon","atk":22,"str":3,"dex":3,"image":"/assets/items/lamina_aurora.webp"}'),
  ('tridente_meria', 'Tridente de Meria', 'weapon', 'legendary', '{"slot":"weapon","atk":20,"intel":8,"image":"/assets/items/tridente_meria.webp"}'),
  ('capuz_viajante', 'Capuz do Viajante', 'armor', 'common', '{"slot":"helmet","def":1,"dex":1,"image":"/assets/items/capuz_viajante.webp"}'),
  ('elmo_ferro', 'Elmo de Ferro', 'armor', 'rare', '{"slot":"helmet","def":3,"con":1,"image":"/assets/items/elmo_ferro.webp"}'),
  ('tiara_lunar', 'Tiara Lunar', 'armor', 'epic', '{"slot":"helmet","def":2,"intel":4,"image":"/assets/items/tiara_lunar.webp"}'),
  ('coroa_vorlag', 'Coroa de Vorlag', 'armor', 'legendary', '{"slot":"helmet","def":5,"atk":3,"intel":3,"image":"/assets/items/coroa_vorlag.webp"}'),
  ('gibao_couro', 'Gibão de Couro', 'armor', 'common', '{"slot":"armor","def":3,"image":"/assets/items/gibao_couro.webp"}'),
  ('cota_malha', 'Cota de Malha', 'armor', 'rare', '{"slot":"armor","def":6,"con":1,"image":"/assets/items/cota_malha.webp"}'),
  ('peitoral_anao', 'Peitoral de Placas Anão', 'armor', 'epic', '{"slot":"armor","def":8,"con":2,"image":"/assets/peitoral_de_placas_anao.webp"}'),
  ('manto_arcano', 'Manto Arcano', 'armor', 'epic', '{"slot":"armor","def":6,"intel":5,"image":"/assets/items/manto_arcano.webp"}'),
  ('armadura_celeste', 'Armadura Celeste', 'armor', 'legendary', '{"slot":"armor","def":16,"con":4,"image":"/assets/items/armadura_celeste.webp"}'),
  ('botas_couro', 'Botas de Couro', 'armor', 'common', '{"slot":"boots","dex":1,"def":1,"image":"/assets/items/botas_couro.webp"}'),
  ('botas_patrulheiro', 'Botas do Patrulheiro', 'armor', 'rare', '{"slot":"boots","dex":3,"def":1,"image":"/assets/items/botas_patrulheiro.webp"}'),
  ('grevas_runicas', 'Grevas Rúnicas', 'armor', 'epic', '{"slot":"boots","def":4,"dex":2,"image":"/assets/items/grevas_runicas.webp"}'),
  ('botas_vento', 'Botas do Vento Celeste', 'armor', 'legendary', '{"slot":"boots","dex":7,"def":3,"image":"/assets/items/botas_vento.webp"}'),
  ('anel_vigor', 'Anel do Vigor', 'accessory', 'rare', '{"slot":"accessory","con":3,"image":"/assets/items/anel_vigor.webp"}'),
  ('estandarte_inspirador', 'Estandarte Inspirador', 'accessory', 'rare', '{"slot":"accessory","atk":2,"con":2,"image":"/assets/estandarte_inspirador.webp"}'),
  ('foco_arcano', 'Foco de Canalização Arcana', 'accessory', 'epic', '{"slot":"accessory","intel":6,"def":1,"image":"/assets/canalizacao_de_magia.webp"}'),
  ('amuleto_serpente', 'Amuleto da Serpente Sinistra', 'accessory', 'legendary', '{"slot":"accessory","atk":4,"def":3,"intel":3,"image":"/assets/amuleto_da_serpente_sinistra.webp"}'),
  ('olho_vazio', 'Olho do Vazio', 'accessory', 'legendary', '{"slot":"accessory","atk":6,"def":4,"intel":6,"str":2,"image":"/assets/items/olho_vazio.webp"}')
on conflict (id) do update set name = excluded.name, kind = excluded.kind, rarity = excluded.rarity, data = excluded.data;

-- Itens já no inventário herdam o espaço do catálogo (para o caso de algum ter mudado).
update public.inventory i set slot = it.data->>'slot'
  from public.items it where it.id = i.item_id and i.slot is distinct from it.data->>'slot';

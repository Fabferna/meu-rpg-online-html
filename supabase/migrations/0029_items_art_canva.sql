-- 0029: artes definitivas (feitas no Canva) dos 18 equipamentos novos. Só muda o campo image
-- (nome novo com -v2, para a CDN e o navegador não mostrarem a arte provisória em cache).
update public.items
   set data = jsonb_set(data, '{image}', to_jsonb('/assets/items/' || id || '-v2.webp'))
 where id in ('arco_tempestade', 'martelo_trovao', 'machado_colosso', 'cajado_astral', 'arco_longo', 'martelo_guerra',
              'espada_capitao', 'cajado_carvalho', 'machado_guerra', 'capuz_sentinela', 'elmo_estelar', 'couraca_escamas',
              'veste_lunar', 'botas_cavaleiro', 'botas_guardiao', 'grevas_eter', 'anel_tempestade', 'talisma_estelar');

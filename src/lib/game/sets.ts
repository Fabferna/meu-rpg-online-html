// Conjuntos de equipamento: vestir 2 ou 3 peças do mesmo conjunto dá um bônus extra.
// Regras puras (sem I/O): o SERVIDOR soma o bônus no combate (player.ts → loadPlayer, como o pet);
// a tela usa as mesmas funções para mostrar o progresso e a comparação ▲/▼.
// Cada item pertence a no máximo UM conjunto. O bônus não depende de aprimoramento nem de afinidade.
import type { ItemBonus } from "./gear";

export type GearSet = {
  id: string;
  name: string;
  /** Peças do conjunto (ids de items.ts). */
  pieces: string[];
  /**
   * Bônus com 2 e com 3 peças (o de 3 substitui o de 2, não soma).
   * Conjunto de 2 peças (dupla arma + acessório) só tem o bônus de 2.
   */
  bonus: { 2: ItemBonus; 3?: ItemBonus };
};

export const GEAR_SETS: GearSet[] = [
  { id: "viajante", name: "Conjunto do Viajante", pieces: ["capuz_viajante", "gibao_couro", "botas_couro"],
    bonus: { 2: { dex: 1 }, 3: { def: 1, dex: 2, con: 1 } } },
  { id: "patrulheiro", name: "Conjunto do Patrulheiro", pieces: ["arco_longo", "botas_do_andarilho", "capuz_do_patrulheiro"],
    bonus: { 2: { dex: 3 }, 3: { dex: 5, atk: 3 } } },
  { id: "valerion", name: "Guarda de Valerion", pieces: ["espada_capitao", "couraca_escamas", "botas_cavaleiro"],
    bonus: { 2: { def: 1, str: 2 }, 3: { def: 3, str: 3, con: 2 } } },
  { id: "escarlate", name: "Guerreiro Escarlate", pieces: ["machado_escarlate", "estandarte_escarlate", "cota_escarlate"],
    bonus: { 2: { str: 3, atk: 3 }, 3: { str: 6, atk: 4, con: 3 } } },
  { id: "forja_runica", name: "Forja Rúnica", pieces: ["martelo_forja", "peitoral_anao", "grevas_runicas"],
    bonus: { 2: { def: 2, con: 2 }, 3: { def: 4, con: 3, str: 3 } } },
  { id: "arcano", name: "Vestes do Arcano", pieces: ["manto_arcano", "tiara_lunar", "foco_arcano"],
    bonus: { 2: { intel: 2 }, 3: { intel: 4, def: 1 } } },
  { id: "ceu_eterno", name: "Céu Eterno", pieces: ["elmo_estelar", "grevas_eter"],
    bonus: { 2: { def: 6, con: 4, str: 2 } } },
  { id: "sombra_lunar", name: "Sombra Lunar", pieces: ["veste_lunar", "arco_tempestade"],
    bonus: { 2: { dex: 6, atk: 4, intel: 2 } } },
  // ── Conjuntos para todas as raças (bônus cresce com o nível das peças) ──
  { id: "aprendiz_floresta", name: "Aprendiz da Floresta", pieces: ["capuz_de_la", "tunica_do_aprendiz", "botas_patrulheiro"],
    bonus: { 2: { dex: 2 }, 3: { dex: 3, intel: 2 } } },
  { id: "batedor_sylvandell", name: "Batedor de Sylvandell", pieces: ["capuz_do_arqueiro", "veste_do_batedor", "sapatilhas_do_batedor"],
    bonus: { 2: { dex: 2, intel: 1 }, 3: { dex: 4, intel: 2, def: 1 } } },
  { id: "brisa_eterea", name: "Brisa Etérea", pieces: ["capuz_sentinela", "manto_do_arcanista", "botas_da_brisa"],
    bonus: { 2: { dex: 4, intel: 2 }, 3: { dex: 6, intel: 4, def: 2 } } },
  { id: "crepusculo_celeste", name: "Crepúsculo Celeste", pieces: ["capuz_das_sombras_celestes", "veste_do_crepusculo", "botas_etereas"],
    bonus: { 2: { dex: 5, intel: 2 }, 3: { dex: 8, intel: 5, def: 3 } } },
  { id: "noite_eterna", name: "Noite Eterna", pieces: ["diadema_da_noite_eterna", "manto_do_veu_etereo", "botas_do_passo_estelar"],
    bonus: { 2: { dex: 5, intel: 3 }, 3: { dex: 9, intel: 5, def: 4 } } },
  { id: "bronze_montanha", name: "Bronze da Montanha", pieces: ["elmo_de_bronze", "cota_de_bronze", "botas_de_bronze"],
    bonus: { 2: { def: 2 }, 3: { def: 3, con: 2 } } },
  { id: "soldado_ferro", name: "Soldado de Ferro", pieces: ["elmo_do_soldado", "armadura_de_placas", "grevas_do_soldado"],
    bonus: { 2: { def: 2, con: 1 }, 3: { def: 4, con: 2, str: 1 } } },
  { id: "guardiao", name: "Muralha do Guardião", pieces: ["elmo_do_guardiao", "armadura_runica", "grevas_de_placas"],
    bonus: { 2: { def: 4, con: 2 }, 3: { def: 6, con: 4, str: 2 } } },
  { id: "placas_runicas", name: "Placas Rúnicas", pieces: ["elmo_runico", "armadura_celeste", "grevas_do_guardiao"],
    bonus: { 2: { def: 4, con: 2 }, 3: { def: 7, con: 4, str: 2 } } },
  { id: "colosso", name: "Fúria do Colosso", pieces: ["elmo_do_colosso", "armadura_do_colosso", "grevas_do_colosso"],
    bonus: { 2: { def: 5, con: 2 }, 3: { def: 8, con: 5, str: 3 } } },
  { id: "rei_montanha", name: "Rei da Montanha", pieces: ["elmo_do_rei_da_montanha", "armadura_do_rei_da_montanha", "grevas_do_rei_da_montanha"],
    bonus: { 2: { def: 5, con: 3 }, 3: { def: 9, con: 5, str: 4 } } },
  { id: "recruta_valerion", name: "Recruta de Valerion", pieces: ["espada_do_recruta", "bracelete_de_couro", "elmo_ferro"],
    bonus: { 2: { str: 2 }, 3: { str: 3, atk: 2 } } },
  { id: "cavaleiro_valerion", name: "Cavaleiro de Valerion", pieces: ["gladio_de_ferro", "brasao_de_valerion"],
    bonus: { 2: { str: 4, atk: 2, dex: 1 } } },
  { id: "veterano", name: "Honra do Veterano", pieces: ["sabre_do_veterano", "anel_do_guerreiro"],
    bonus: { 2: { str: 5, atk: 3, dex: 1 } } },
  { id: "paladino", name: "Juramento do Paladino", pieces: ["espada_do_alvorecer", "selo_do_paladino"],
    bonus: { 2: { str: 7, atk: 4, dex: 2 } } },
  { id: "campeao", name: "Glória do Campeão", pieces: ["montante_real", "insignia_do_campeao", "botas_guardiao"],
    bonus: { 2: { str: 5, atk: 3 }, 3: { str: 8, atk: 5, dex: 3 } } },
  { id: "rei_eterno", name: "Legado do Rei Eterno", pieces: ["espada_do_rei_eterno", "medalhao_do_tita"],
    bonus: { 2: { str: 10, atk: 6, dex: 3 } } },
  { id: "cacador_presas", name: "Caçador de Presas", pieces: ["machado_guerra", "colar_de_presas"],
    bonus: { 2: { str: 4, atk: 2, con: 1 } } },
  { id: "totem_guerra", name: "Chamado do Totem", pieces: ["machado_da_furia", "totem_de_guerra"],
    bonus: { 2: { str: 7, atk: 4, con: 2 } } },
  { id: "tita", name: "Ira do Titã", pieces: ["machado_do_tita", "presa_do_tita"],
    bonus: { 2: { str: 9, atk: 5, con: 3 } } },
  { id: "pedreira", name: "Pedreira Anã", pieces: ["martelo_de_pedra", "amuleto_de_pedra"],
    bonus: { 2: { con: 4, def: 2, str: 1 } } },
  { id: "bigorna", name: "Bigorna do Ferreiro", pieces: ["martelo_do_ferreiro", "pingente_do_guardiao"],
    bonus: { 2: { con: 5, def: 3, str: 1 } } },
  { id: "montanha_runica", name: "Montanha Rúnica", pieces: ["martelo_runico_de_guerra", "amuleto_da_montanha"],
    bonus: { 2: { con: 7, def: 4, str: 2 } } },
  { id: "coracao_terra", name: "Coração da Terra", pieces: ["martelo_do_coracao_da_terra", "coracao_do_colosso"],
    bonus: { 2: { con: 10, def: 6, str: 3 } } },
  { id: "teixo_agil", name: "Teixo Ágil", pieces: ["arco_de_teixo", "anel_da_agilidade"],
    bonus: { 2: { dex: 3, atk: 2, def: 1 } } },
  { id: "lua_cacadora", name: "Lua Caçadora", pieces: ["arco_lunar", "bracelete_do_cacador"],
    bonus: { 2: { dex: 5, atk: 3, def: 1 } } },
  { id: "prata_tempestade", name: "Prata da Tempestade", pieces: ["arco_de_prata_elfica", "anel_tempestade"],
    bonus: { 2: { dex: 7, atk: 4, def: 2 } } },
  { id: "vento_crepusculo", name: "Vento do Crepúsculo", pieces: ["arco_do_crepusculo", "anel_do_vento_veloz"],
    bonus: { 2: { dex: 8, atk: 5, def: 3 } } },
  { id: "fenix_luar", name: "Fênix do Último Luar", pieces: ["arco_do_ultimo_luar", "pena_da_fenix_prateada"],
    bonus: { 2: { dex: 10, atk: 6, def: 3 } } },
  { id: "cristal_aprendiz", name: "Cristal do Aprendiz", pieces: ["cajado_de_cristal_azul", "anel_do_aprendiz"],
    bonus: { 2: { intel: 3, def: 2, con: 1 } } },
  { id: "arcanista", name: "Sabedoria do Arcanista", pieces: ["cajado_do_arcanista", "pingente_do_arcanista"],
    bonus: { 2: { intel: 5, def: 3, con: 1 } } },
  { id: "mares", name: "Maré Profunda", pieces: ["cajado_das_mares", "pingente_arcano"],
    bonus: { 2: { intel: 5, def: 3, con: 1 } } },
  { id: "constelacao", name: "Constelação", pieces: ["cajado_das_constelacoes", "talisma_estelar"],
    bonus: { 2: { intel: 8, def: 5, con: 2 } } },
  { id: "primeiro_arcano", name: "Primeiro Arcano", pieces: ["cajado_do_primeiro_arcano", "coracao_do_primeiro_arcano"],
    bonus: { 2: { intel: 10, def: 6, con: 3 } } },
  { id: "meria", name: "Serpente de Meria", pieces: ["tridente_meria", "amuleto_serpente"],
    bonus: { 2: { intel: 8, def: 5, con: 2 } } },
  // ── Conjuntos remontados para todas as peças terem o mesmo nível ──
  { id: "veu_estelar", name: "Véu Estelar", pieces: ["diadema_etereo", "manto_das_estrelas", "botas_vento"],
    bonus: { 2: { dex: 4, intel: 2 }, 3: { dex: 7, intel: 4, def: 2 } } },
  { id: "sentinela_ferro", name: "Sentinela de Ferro", pieces: ["elmo_de_placas", "couraca_do_guardiao"],
    bonus: { 2: { def: 5, con: 3, str: 1 } } },
  { id: "eter_mares", name: "Éter das Marés", pieces: ["cajado_eter", "orbe_das_mares"],
    bonus: { 2: { intel: 7, def: 4, con: 2 } } },
  // ── Relíquias do Chefe do Mundo (arma + acessório da mesma raça) ──
  { id: "relic_eclipse", name: "Relíquias do Eclipse", pieces: ["lamina_eclipse_solar", "selo_rei_dourado"], bonus: { 2: { str: 6, atk: 5, dex: 3 } } },
  { id: "relic_cometa", name: "Relíquias do Cometa", pieces: ["arco_cometa_errante", "lagrima_lua_prateada"], bonus: { 2: { dex: 7, atk: 5, def: 2 } } },
  { id: "relic_nucleo", name: "Relíquias do Núcleo", pieces: ["martelo_nucleo_ardente", "runa_coracao_ferro"], bonus: { 2: { con: 6, def: 4, str: 4 } } },
  { id: "relic_devorador", name: "Relíquias do Devorador", pieces: ["machado_devorador_mundos", "presa_leviata"], bonus: { 2: { str: 6, atk: 5, con: 3 } } },
  { id: "relic_abismo", name: "Relíquias do Abismo", pieces: ["cajado_abismo_estelar", "olho_firmamento"], bonus: { 2: { intel: 7, def: 2, con: 3 } } },
];

export const SET_BY_ID = Object.fromEntries(GEAR_SETS.map((s) => [s.id, s]));
/** Conjunto de cada item (item → conjunto). */
export const SET_OF_ITEM: Record<string, GearSet> = Object.fromEntries(GEAR_SETS.flatMap((s) => s.pieces.map((p) => [p, s])));

export type ActiveSet = { set: GearSet; count: number; bonus: ItemBonus | null };

/** Conjuntos com pelo menos 1 peça equipada, com quantas peças e o bônus ativo (null se < 2). */
export function activeSets(equippedIds: string[]): ActiveSet[] {
  const ids = new Set(equippedIds);
  return GEAR_SETS.map((set) => {
    const count = set.pieces.filter((p) => ids.has(p)).length;
    const bonus = (count >= 3 ? set.bonus[3] : null) ?? (count >= 2 ? set.bonus[2] : null);
    return { set, count, bonus };
  }).filter((a) => a.count > 0);
}

/** Bônus de conjunto para somar no combate (mesma lista do pet: ItemBonus[]). */
export function setBonuses(equippedIds: string[]): ItemBonus[] {
  return activeSets(equippedIds).flatMap((a) => (a.bonus ? [a.bonus] : []));
}

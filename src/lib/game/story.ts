// História principal: Ato I (1–10) e Ato II (11–15). Cada um termina numa luta única.
export type Speaker = "lyra" | "kaelen" | "roric" | "vorlag" | "narrador";
export const SPEAKERS: Record<Speaker, { name: string; portrait: string | null }> = {
  lyra: { name: "Lyra, Sacerdotisa da Lua", portrait: "/assets/lyra_a_sacerdotisa_da_lua.webp" },
  kaelen: { name: "Kaelen, Guardião da Chama", portrait: "/assets/kaelen_guardiao_da_chama.webp" },
  roric: { name: "Roric Corvo", portrait: "/assets/roric_corvo__blackwood.webp" },
  vorlag: { name: "Lorde Vorlag", portrait: "/assets/lord_vorlag_sombrio.webp" },
  narrador: { name: "", portrait: null },
};

export type Chapter = {
  n: number; title: string; region: string; minLevel: number;
  scenes: { who: Speaker; text: string }[];
  victory: string;
  enemy: string; // id de inimigo da história (enemies.ts, oculto da Caçada)
  rewards: { xp: number; gold: number; gems: number; item?: string; cosmetic?: string };
};

// Use {heroi} para o nome do jogador.
// XP de cada capítulo ≈ 35% do nível recomendado (curva de rules.ts): a história é um marco, não o motor do XP.
export const CHAPTERS: Chapter[] = [
  { n: 1, title: "Sombras em Valerion", region: "valerion", minLevel: 1, enemy: "story_batedor",
    scenes: [
      { who: "narrador", text: "Os sinos de Valerion tocam fora de hora. Ao longe, uma névoa negra rasteja sobre as muralhas." },
      { who: "kaelen", text: "Você é {heroi}? Chegou na hora certa. Criaturas de sombra atravessaram o portão leste esta noite." },
      { who: "kaelen", text: "Uma delas comanda as outras. Encontre esse batedor antes que ele traga o resto da horda." },
    ],
    victory: "O batedor se desfaz em fumaça, deixando para trás um amuleto com um olho vazio gravado.",
    rewards: { xp: 60, gold: 100, gems: 5 } },
  { n: 2, title: "O Uivo na Estrada", region: "valerion", minLevel: 3, enemy: "story_alfa",
    scenes: [
      { who: "lyra", text: "Esse símbolo... o Olho Vazio. Um culto que eu acreditava extinto há cem anos." },
      { who: "lyra", text: "Os lobos da estrada norte enlouqueceram na mesma noite em que as sombras surgiram. Não é coincidência." },
      { who: "lyra", text: "Derrote o alfa da matilha, {heroi}. Depois, siga-me até Sylvandell: a floresta guarda respostas." },
    ],
    victory: "Com o alfa caído, os outros lobos fogem. A estrada para Sylvandell está livre.",
    rewards: { xp: 150, gold: 200, gems: 5 } },
  { n: 3, title: "Sussurros nas Ruínas", region: "sylvandell", minLevel: 5, enemy: "story_sacerdote",
    scenes: [
      { who: "narrador", text: "As árvores de Sylvandell são mais antigas que qualquer reino. Entre elas, ruínas cobertas de musgo brilham em azul." },
      { who: "roric", text: "Ora, ora. Mais um herói atrás do culto? Eu os sigo há meses. Pago bem por informação — e informo de graça quando gosto de alguém." },
      { who: "roric", text: "Um sacerdote do Olho Vazio realiza rituais nestas ruínas. Pare-o e eu conto o que sei." },
    ],
    victory: "Nas vestes do sacerdote, um mapa marca três pontos: Sylvandell, o Deserto Âmbar e as Agulhas Congeladas.",
    rewards: { xp: 350, gold: 320, gems: 5 } },
  { n: 4, title: "O Guardião Esquecido", region: "sylvandell", minLevel: 7, enemy: "story_guardiao",
    scenes: [
      { who: "lyra", text: "O primeiro ponto do mapa fica aqui, sob o grande carvalho. Há um selo antigo... e ele está rachado." },
      { who: "lyra", text: "Um espírito guardião protegia o selo. O culto o corrompeu. Liberte-o, {heroi}, e o selo resistirá." },
    ],
    victory: "O espírito encontra paz. Antes de sumir, sussurra: \"O segundo selo queima sob as areias\".",
    rewards: { xp: 800, gold: 450, gems: 5, item: "estandarte_inspirador" } },
  { n: 5, title: "A Rainha das Areias", region: "deserto", minLevel: 10, enemy: "story_rainha",
    scenes: [
      { who: "roric", text: "O Deserto Âmbar. Já perdi duas caravanas aqui. O segundo selo fica numa cidade soterrada, guardada por algo grande." },
      { who: "narrador", text: "A areia treme. Uma carapaça dourada emerge das dunas, maior que uma casa." },
    ],
    victory: "A Rainha Escorpião tomba. Sob ela, o segundo selo — ainda inteiro. Por enquanto.",
    rewards: { xp: 2100, gold: 650, gems: 10 } },
  { n: 6, title: "O Ritual Interrompido", region: "deserto", minLevel: 13, enemy: "story_mestre",
    scenes: [
      { who: "kaelen", text: "Recebi sua mensagem e vim o mais rápido que pude. O Mestre dos Rituais está aqui, tentando quebrar o selo à força." },
      { who: "vorlag", text: "(uma voz ecoa de lugar nenhum) Que adorável. Mais um peão tentando segurar a maré com as mãos." },
      { who: "kaelen", text: "Essa voz... é Vorlag. Ele está vivo. Acabe com o ritual, {heroi}, eu seguro os acólitos!" },
    ],
    victory: "O ritual se desfaz. O Mestre, antes de cair, ri: \"O terceiro selo já está perdido nas montanhas\".",
    rewards: { xp: 4300, gold: 900, gems: 5 } },
  { n: 7, title: "O Colosso das Agulhas", region: "agulhas", minLevel: 16, enemy: "story_colosso",
    scenes: [
      { who: "narrador", text: "O vento das Agulhas Congeladas corta como lâmina. Nas forjas abandonadas dos anões, algo se move." },
      { who: "roric", text: "Os anões selaram um colosso de gelo aqui, séculos atrás. O culto o acordou para destruir o último selo." },
      { who: "roric", text: "Se ele cair, o caminho para Meria se abre. Para nós... e para Vorlag." },
    ],
    victory: "O colosso se parte em mil cristais. Mas o selo já foi rompido — e o mar ao sul começa a ferver.",
    rewards: { xp: 7500, gold: 1200, gems: 5, item: "martelo_forja" } },
  { n: 8, title: "O Arauto do Abismo", region: "agulhas", minLevel: 19, enemy: "story_arauto",
    scenes: [
      { who: "lyra", text: "Os três selos mantinham Meria no fundo do oceano. Agora o reino abissal está subindo." },
      { who: "lyra", text: "Um arauto guarda a passagem. Derrote-o e entraremos em Meria antes que Vorlag complete o despertar." },
    ],
    victory: "O arauto afunda nas águas negras. Uma escadaria de coral se ergue do mar: o caminho para Meria.",
    rewards: { xp: 11950, gold: 1500, gems: 5 } },
  { n: 9, title: "O Trono de Vorlag", region: "meria", minLevel: 22, enemy: "story_vorlag",
    scenes: [
      { who: "vorlag", text: "{heroi}. Finalmente. Você destruiu meus servos, libertou espíritos, quebrou meus rituais..." },
      { who: "vorlag", text: "...e mesmo assim abriu as portas de Meria para mim. Obrigado. Agora ajoelhe-se diante do novo rei." },
      { who: "kaelen", text: "Não dê ouvidos! Lute, {heroi}! Nós estamos com você!" },
    ],
    victory: "Vorlag cai de joelhos. \"Tolo... eu era a única coisa que a mantinha dormindo.\" O chão de Meria começa a tremer.",
    rewards: { xp: 17700, gold: 2000, gems: 10 } },
  { n: 10, title: "Meria, a Serpente Primordial", region: "meria", minLevel: 25, enemy: "story_meria",
    scenes: [
      { who: "narrador", text: "Das profundezas surge Meria, a serpente que dá nome ao reino — a origem de toda a escuridão de Aethelgard." },
      { who: "lyra", text: "Vorlag não queria governá-la. Queria contê-la. E nós o derrotamos..." },
      { who: "roric", text: "Então cabe a nós terminar o serviço. {heroi}, todo o reino está olhando para você." },
    ],
    victory: "Meria se desfaz em luz. O céu de Aethelgard clareia pela primeira vez em um século. Seu nome será cantado por gerações.",
    rewards: { xp: 25000, gold: 5000, gems: 30, cosmetic: "title_salvador" } },

  // ── ATO II: O Olho Vazio ──
  { n: 11, title: "O Céu Partido", region: "ilhas", minLevel: 26, enemy: "story_rainha_harpia",
    scenes: [
      { who: "narrador", text: "Três dias depois da queda de Meria, um estrondo racha o céu de Aethelgard. Por uma fenda de luz, ilhas de pedra flutuam acima das nuvens." },
      { who: "lyra", text: "A luz que libertou Meria rasgou o véu do céu. Eu nunca vi as Ilhas Celestes... só ouvi lendas." },
      { who: "kaelen", text: "Lendas não descem em bando para atacar vilarejos, {heroi}. Harpias estão caçando nas planícies. Derrube a rainha delas." },
    ],
    victory: "A Rainha das Harpias cai entre as nuvens. Presa ao seu colar, uma pena negra com o desenho de um olho vazio.",
    rewards: { xp: 27800, gold: 5500, gems: 10, item: "botas_vento" } },
  { n: 12, title: "As Ilhas Flutuantes", region: "ilhas", minLevel: 29, enemy: "story_sentinela",
    scenes: [
      { who: "roric", text: "Achei uma ponte de cristal que liga as ilhas. E adivinha? Alguém andou vendendo mapas dela no Mercado das Sombras." },
      { who: "roric", text: "O culto do Olho Vazio não morreu com Vorlag, {heroi}. Eles estão subindo para o céu. E uma sentinela de pedra não deixa ninguém passar." },
    ],
    victory: "A Sentinela Ancestral se ajoelha e se desfaz em poeira dourada. A ponte de cristal se acende até o pico mais alto.",
    rewards: { xp: 37300, gold: 6000, gems: 10 } },
  { n: 13, title: "Aurion, o Dragão Celeste", region: "ilhas", minLevel: 32, enemy: "story_aurion",
    scenes: [
      { who: "narrador", text: "No topo das ilhas dorme Aurion, o dragão que guarda o céu há mil anos. Seus olhos agora brilham num roxo doentio." },
      { who: "lyra", text: "Ele está corrompido, {heroi}. Não queremos matá-lo... mas talvez seja a única forma de quebrar o feitiço." },
    ],
    victory: "Aurion cai, e o roxo deixa seus olhos. \"Obrigado, pequeno herói. O culto nunca serviu a Meria. Serviam a Nyx — a fome que vive no Vazio.\"",
    rewards: { xp: 48700, gold: 7000, gems: 15, item: "lamina_aurora" } },
  { n: 14, title: "A Fenda do Vazio", region: "vazio", minLevel: 35, enemy: "story_arauto_vazio",
    scenes: [
      { who: "narrador", text: "Aurion leva você até a borda do mundo. Ali, onde Meria dormia, abriu-se uma fenda que engole até a luz das estrelas." },
      { who: "vorlag", text: "(um eco da voz de Vorlag) Eu prendi Meria para que Nyx não tivesse por onde entrar. Agora a porta está aberta, {heroi}." },
      { who: "kaelen", text: "Um arauto guarda a fenda. Se ele cair, Nyx terá que vir pessoalmente." },
    ],
    victory: "O Arauto do Vazio se dissolve em estrelas apagadas. Do fundo da fenda, um único olho gigante se abre — e olha diretamente para você.",
    rewards: { xp: 62000, gold: 8000, gems: 15, item: "coroa_vorlag" } },
  { n: 15, title: "Nyx, o Olho Vazio", region: "vazio", minLevel: 38, enemy: "story_nyx",
    scenes: [
      { who: "narrador", text: "Nyx atravessa a fenda: uma silhueta feita de céu noturno, com um olho no lugar do rosto." },
      { who: "lyra", text: "Todos estão aqui, {heroi}. Aurion, os anões, os elfos, Valerion inteira. Nós seguramos a fenda. Você segura Nyx." },
      { who: "roric", text: "E, por favor, não morra. Ainda tenho mapas para vender para você." },
    ],
    victory: "Nyx se parte como vidro negro. A fenda se fecha, e uma chuva de estrelas cai sobre Aethelgard. O Olho Vazio nunca mais se abrirá.",
    rewards: { xp: 77400, gold: 12000, gems: 40, item: "olho_vazio", cosmetic: "title_estrelas" } },
];
export const CHAPTER_BY_N = Object.fromEntries(CHAPTERS.map((c) => [c.n, c]));

// ── Trechos: 2 lutas antes do chefe de cada capítulo ─────────────────
// Liberados no nível exigido pelo capítulo ANTERIOR: depois de vencer um capítulo, o herói já tem
// 3 lutas pela frente (2 trechos + chefe) e os trechos dão XP para chegar ao nível do chefe.
// O progresso fica em user_counters ('story_trail' = capítulo×10 + trechos vencidos; migração 0034).
export type TrailStep = { enemy: string; who: Speaker; text: string };
export const STORY_TRAILS: Record<number, TrailStep[]> = {
  1: [{ enemy: "tr_vigia_sombrio", who: "kaelen", text: "Antes do batedor, há vigias. Limpe o caminho até o portão leste, {heroi}." }, { enemy: "tr_sombra_portao", who: "narrador", text: "Uma sombra maior bloqueia o portão. Ela sibila o seu nome." }],
  2: [{ enemy: "tr_lobo_raivoso", who: "lyra", text: "Os lobos da estrada atacam qualquer um. Abra caminho até a toca do alfa." }, { enemy: "tr_lobo_sentinela", who: "narrador", text: "Um lobo de olhos vermelhos uiva, chamando o alfa." }],
  3: [{ enemy: "tr_acolito_floresta", who: "roric", text: "Acólitos vigiam a trilha das ruínas. Não deixe nenhum avisar o sacerdote." }, { enemy: "tr_vulto_ruinas", who: "narrador", text: "Das pedras azuis, um vulto se ergue para proteger o ritual." }],
  4: [{ enemy: "tr_javali_sagrado", who: "lyra", text: "Os animais do bosque sagrado foram corrompidos. Liberte-os do feitiço." }, { enemy: "tr_vulto_selo", who: "narrador", text: "O selo rachado solta ecos sombrios que tomam forma." }],
  5: [{ enemy: "tr_escorpiao_duna", who: "roric", text: "Escorpiões cercam a cidade soterrada. São os filhotes da Rainha." }, { enemy: "tr_saqueador_ambar", who: "narrador", text: "Um saqueador do culto tenta roubar o mapa da cidade soterrada." }],
  6: [{ enemy: "tr_acolito_ritual", who: "kaelen", text: "Os acólitos alimentam o ritual com a própria vida. Interrompa os círculos!" }, { enemy: "tr_guarda_mestre", who: "narrador", text: "O braço direito do Mestre dos Rituais ergue sua lâmina curva." }],
  7: [{ enemy: "tr_golem_menor", who: "narrador", text: "Nas Agulhas, pedaços do Colosso ganham vida própria." }, { enemy: "tr_lobo_gelo", who: "roric", text: "Lobos brancos caçam na nevasca. Não pare de andar, {heroi}." }],
  8: [{ enemy: "tr_cultista_gelo", who: "kaelen", text: "O culto abriu um portal no topo da montanha. Os guardas vêm primeiro." }, { enemy: "tr_espreitador_abismo", who: "narrador", text: "Do portal escorre algo que não é deste mundo." }],
  9: [{ enemy: "tr_guarda_trono", who: "vorlag", text: "Meus guardas nunca dormem, peão. Venha descobrir por quê." }, { enemy: "tr_serpe_menor", who: "lyra", text: "As serpes vigiam o caminho até o trono de Vorlag. Cuidado com o veneno." }],
  10: [{ enemy: "tr_cria_meria", who: "narrador", text: "As crias da Serpente Primordial emergem do mar negro." }, { enemy: "tr_vorlag_eco", who: "lyra", text: "Um eco de Vorlag ainda protege o santuário de Meria." }],
  11: [{ enemy: "tr_harpia_jovem", who: "roric", text: "O céu se partiu e harpias desceram das ilhas. Elas atacam em bando." }, { enemy: "tr_harpia_batedora", who: "narrador", text: "Uma harpia de penas douradas grita, chamando a rainha." }],
  12: [{ enemy: "tr_sentinela_ponte", who: "lyra", text: "As pontes de cristal são guardadas por sentinelas antigas." }, { enemy: "tr_harpia_tempestade", who: "narrador", text: "Raios cercam a última ponte antes das ilhas altas." }],
  13: [{ enemy: "tr_draconato", who: "kaelen", text: "Os filhos de Aurion protegem o ninho. Prove que é digno." }, { enemy: "tr_sentinela_ninho", who: "narrador", text: "Uma sentinela de éter desperta ao lado do ovo dourado." }],
  14: [{ enemy: "tr_espectro_fenda", who: "lyra", text: "Na Fenda do Vazio, até a luz tem medo. Fique perto de mim." }, { enemy: "tr_devorador_menor", who: "narrador", text: "Algo devora as estrelas do céu, uma por uma." }],
  15: [{ enemy: "tr_arauto_nyx", who: "vorlag", text: "(a voz de Vorlag, agora fraca) Nyx me usou também... Os arautos dela guardam o Olho." }, { enemy: "tr_devorador_estrelas", who: "narrador", text: "Diante do Olho Vazio, a última criatura abre a boca infinita." }],
};
export const trailOf = (n: number) => STORY_TRAILS[n] ?? [];
/** Nível para os trechos do capítulo n: o do capítulo anterior. */
export const trailLevel = (n: number) => CHAPTER_BY_N[n - 1]?.minLevel ?? 1;
/** Trechos já vencidos no capítulo n, a partir do contador salvo (capítulo×10 + trechos). */
export const trailDone = (n: number, counter: number) => (Math.floor(counter / 10) === n ? counter % 10 : 0);

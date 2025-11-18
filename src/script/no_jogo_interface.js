// =============================
// CONSTANTES DE STORAGE
// =============================
const HERO_STORAGE_KEY = "aethelgard_hero";
const QUESTS_STORAGE_KEY = "aethelgard_quests";

// =============================
// DEFINIÇÃO DE MISSÕES
// =============================

const QUESTS = {
  main_01_sombras_em_valerion: {
    id: "main_01_sombras_em_valerion",
    title: "Sombras em Valerion",
    shortDescription:
      "Os guardas de Valerion estão preocupados com ataques de criaturas sombrias. Descubra o que está por trás disso.",
    steps: [
      "Fale com os guardas na entrada de Valerion.",
      "Receba mais informações sobre os ataques e sobre o capitão na taverna.",
      "Encontre o mercador misterioso e aceite o amuleto estranho."
    ],
    rewards: {
      xp: 50,
      gold: 15
    }
  }
};

// =============================
// REGRAS DE XP / LEVEL
// =============================

// XP necessário para o próximo nível (escala simples e legível)
function xpNeededForNextLevel(level) {
  // Exemplo: Nível 1 → 50 XP, Nível 2 → 75 XP, Nível 3 → 100 XP...
  return 50 + (level - 1) * 25;
}

// =============================
// SISTEMA DO HERÓI
// =============================

function getDefaultHero() {
  return {
    name: "Herói Desconhecido",
    race: "Humano",
    region: "Valerion",
    level: 1,
    xp: 0,
    attributePoints: 0,
    gold: 0,
    stats: {
      strength: 6,
      agility: 6,
      intellect: 6,
      vitality: 6,
      wisdom: 6,
      charisma: 6
    },
    resources: {
      hp: 60,
      maxHp: 60,
      mana: 40,
      maxMana: 40,
      energy: 60,
      maxEnergy: 60
    },
    appearance: {
      gender: null,
      imageSrc: ""
    }
  };
}

// Recalcula HP/Mana/Energia máximos a partir dos atributos
function recalcResourcesFromStats(hero) {
  const vit = hero.stats.vitality ?? 6;
  const int = hero.stats.intellect ?? 6;
  const agi = hero.stats.agility ?? 6;

  hero.resources.maxHp = vit * 10;
  hero.resources.maxMana = int * 8;
  hero.resources.maxEnergy = agi * 10;

  if (hero.resources.hp > hero.resources.maxHp) {
    hero.resources.hp = hero.resources.maxHp;
  }
  if (hero.resources.mana > hero.resources.maxMana) {
    hero.resources.mana = hero.resources.maxMana;
  }
  if (hero.resources.energy > hero.resources.maxEnergy) {
    hero.resources.energy = hero.resources.maxEnergy;
  }
}

// Garante que o herói tenha todas as propriedades necessárias
function normalizeHero(hero) {
  if (!hero.stats) {
    hero.stats = {
      strength: 6,
      agility: 6,
      intellect: 6,
      vitality: 6,
      wisdom: 6,
      charisma: 6
    };
  }

  if (!hero.resources) {
    hero.resources = {
      hp: 60,
      maxHp: 60,
      mana: 40,
      maxMana: 40,
      energy: 60,
      maxEnergy: 60
    };
  }

  if (typeof hero.level !== "number") hero.level = 1;
  if (typeof hero.xp !== "number") hero.xp = 0;
  if (typeof hero.attributePoints !== "number") hero.attributePoints = 0;

  if (!hero.appearance) {
    hero.appearance = { gender: null, imageSrc: "" };
  }

  recalcResourcesFromStats(hero);
  return hero;
}

function loadHeroFromStorage() {
  const raw = localStorage.getItem(HERO_STORAGE_KEY);
  if (!raw) {
    const defaultHero = getDefaultHero();
    localStorage.setItem(HERO_STORAGE_KEY, JSON.stringify(defaultHero));
    return defaultHero;
  }

  try {
    const hero = JSON.parse(raw);
    return normalizeHero(hero);
  } catch (e) {
    console.warn("Falha ao ler herói do localStorage, usando padrão.", e);
    const defaultHero = getDefaultHero();
    localStorage.setItem(HERO_STORAGE_KEY, JSON.stringify(defaultHero));
    return defaultHero;
  }
}

function saveHeroToStorage(hero) {
  localStorage.setItem(HERO_STORAGE_KEY, JSON.stringify(hero));
}

function updateBar(barElement, textElement, current, max) {
  if (!barElement || !textElement) return;
  const percent =
    max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  barElement.style.width = percent + "%";
  textElement.textContent = `${current} / ${max}`;
}

function renderHeroStatus(hero) {
  // --------- Painel principal (no <main>) ---------
  const nameEl = document.querySelector("#hero-name");
  const raceRegionEl = document.querySelector("#hero-race-region");
  const levelEl = document.querySelector("#hero-level");
  const xpTextEl = document.querySelector("#hero-xp");
  const goldEl = document.querySelector("#hero-gold-amount");

  if (nameEl) nameEl.textContent = hero.name;
  if (raceRegionEl) raceRegionEl.textContent = `${hero.race} • ${hero.region}`;
  if (levelEl) levelEl.textContent = `Nível ${hero.level}`;
  if (xpTextEl) xpTextEl.textContent = `XP: ${hero.xp}`;
  if (goldEl) goldEl.textContent = hero.gold;

  // Atributos principais
  const strEl = document.querySelector("#hero-str");
  const agiEl = document.querySelector("#hero-agi");
  const intEl = document.querySelector("#hero-int");
  const vitEl = document.querySelector("#hero-vit");

  if (strEl) strEl.textContent = hero.stats.strength;
  if (agiEl) agiEl.textContent = hero.stats.agility;
  if (intEl) intEl.textContent = hero.stats.intellect;
  if (vitEl) vitEl.textContent = hero.stats.vitality;

  // Barras do painel
  const hpBar = document.querySelector("#hero-hp-bar");
  const hpText = document.querySelector("#hero-hp-text");
  const manaBar = document.querySelector("#hero-mana-bar");
  const manaText = document.querySelector("#hero-mana-text");
  const energyBar = document.querySelector("#hero-energy-bar");
  const energyText = document.querySelector("#hero-energy-text");

  updateBar(hpBar, hpText, hero.resources.hp, hero.resources.maxHp);
  updateBar(manaBar, manaText, hero.resources.mana, hero.resources.maxMana);
  updateBar(
    energyBar,
    energyText,
    hero.resources.energy,
    hero.resources.maxEnergy
  );

  // Barra de XP
  const xpBar = document.querySelector("#hero-xp-bar");
  const xpBarText = document.querySelector("#hero-xp-bar-text");
  const xpNeeded = xpNeededForNextLevel(hero.level);
  updateBar(xpBar, xpBarText, hero.xp, xpNeeded);

  // Pontos de atributo
  const apTextEl = document.querySelector("#hero-attribute-points-text");
  const attrButtons = document.querySelectorAll(".attr-btn");
  const points = hero.attributePoints || 0;

  if (apTextEl) {
    apTextEl.textContent = `Pontos de atributo disponíveis: ${points}`;
  }

  attrButtons.forEach((btn) => {
    btn.disabled = points <= 0;
  });

  // --------- Header fixo (topo da página) ---------
  const headerNameEl = document.querySelector("#player-char-name");
  const headerGoldEl = document.querySelector("#player-gold");
  const headerPortraitEl = document.querySelector("#player-char-img");

  if (headerNameEl) headerNameEl.textContent = hero.name;
  if (headerGoldEl) headerGoldEl.textContent = `Ouro: ${hero.gold}`;
  if (headerPortraitEl && hero.appearance && hero.appearance.imageSrc) {
    headerPortraitEl.src = hero.appearance.imageSrc;
  }

  const headerHpBar = document.querySelector("#hp-bar");
  const headerHpText = document.querySelector("#hp-value");
  const headerManaBar = document.querySelector("#mana-bar");
  const headerManaText = document.querySelector("#mana-value");
  const headerEnergyBar = document.querySelector("#energy-bar");
  const headerEnergyText = document.querySelector("#energy-value");

  updateBar(headerHpBar, headerHpText, hero.resources.hp, hero.resources.maxHp);
  updateBar(
    headerManaBar,
    headerManaText,
    hero.resources.mana,
    hero.resources.maxMana
  );
  updateBar(
    headerEnergyBar,
    headerEnergyText,
    hero.resources.energy,
    hero.resources.maxEnergy
  );
}

// Expor o herói atual
let currentHero = null;

// =============================
// SISTEMA DE MISSÕES
// =============================

let questsState = {}; // { questId: { status: 'active'|'completed'|'locked', currentStep: number } }

function loadQuestsFromStorage() {
  const raw = localStorage.getItem(QUESTS_STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Falha ao ler missões do localStorage:", e);
    return {};
  }
}

function saveQuestsToStorage() {
  localStorage.setItem(QUESTS_STORAGE_KEY, JSON.stringify(questsState));
}

function getQuestState(id) {
  if (!questsState[id]) {
    questsState[id] = {
      status: "locked",
      currentStep: 0
    };
  }
  return questsState[id];
}

function pushQuestMessage(text) {
  const msgContainer = document.querySelector("#quest-messages");
  if (!msgContainer) return;
  const p = document.createElement("p");
  p.textContent = text;
  msgContainer.appendChild(p);
}

function renderQuestLog() {
  const activeContainer = document.querySelector("#active-quest");
  const completedContainer = document.querySelector("#completed-quests");

  if (!activeContainer || !completedContainer) return;

  activeContainer.innerHTML = "";
  completedContainer.innerHTML = "";

  const questIds = Object.keys(questsState);
  const activeIds = questIds.filter((id) => questsState[id].status === "active");
  const completedIds = questIds.filter(
    (id) => questsState[id].status === "completed"
  );

  // Missão ativa (por enquanto consideramos só 1 principal)
  if (activeIds.length === 0) {
    const p = document.createElement("p");
    p.className = "quest-empty";
    p.textContent = "Você ainda não possui missões ativas.";
    activeContainer.appendChild(p);
  } else {
    const id = activeIds[0];
    const questDef = QUESTS[id];
    const questState = questsState[id];

    if (questDef) {
      const h4 = document.createElement("h4");
      h4.textContent = questDef.title;

      const desc = document.createElement("p");
      desc.textContent = questDef.shortDescription;

      const step = document.createElement("p");
      const currentStepText =
        questDef.steps[questState.currentStep] ||
        "Continue avançando em sua jornada.";
      step.innerHTML = `<strong>Objetivo atual:</strong> ${currentStepText}`;

      activeContainer.appendChild(h4);
      activeContainer.appendChild(desc);
      activeContainer.appendChild(step);
    }
  }

  // Missões concluídas
  if (completedIds.length > 0) {
    const title = document.createElement("h4");
    title.textContent = "Missões concluídas";
    completedContainer.appendChild(title);

    const ul = document.createElement("ul");

    completedIds.forEach((id) => {
      const questDef = QUESTS[id];
      const li = document.createElement("li");
      li.textContent = questDef ? questDef.title : id;
      ul.appendChild(li);
    });

    completedContainer.appendChild(ul);
  }
}

function startQuest(id) {
  const questDef = QUESTS[id];
  if (!questDef) return;

  const state = getQuestState(id);
  if (state.status === "active" || state.status === "completed") {
    return; // já começou ou terminou
  }

  state.status = "active";
  state.currentStep = 0;
  pushQuestMessage(`Nova missão aceita: "${questDef.title}".`);
  saveQuestsToStorage();
  renderQuestLog();
}

function advanceQuestStep(id) {
  const questDef = QUESTS[id];
  if (!questDef) return;

  const state = getQuestState(id);
  if (state.status !== "active") return;

  if (state.currentStep < questDef.steps.length - 1) {
    state.currentStep += 1;
    const stepText = questDef.steps[state.currentStep];
    pushQuestMessage(`Objetivo atualizado: ${stepText}`);
  } else {
    completeQuest(id);
    return;
  }

  saveQuestsToStorage();
  renderQuestLog();
}

// =============================
// XP / LEVEL UP / ATRIBUTOS
// =============================

function gainXp(amount, reason) {
  if (!currentHero) return;

  let remaining = amount;

  while (remaining > 0) {
    const needed =
      xpNeededForNextLevel(currentHero.level) - currentHero.xp;

    if (remaining >= needed) {
      // Ganha XP suficiente para subir de nível
      currentHero.xp += needed;
      remaining -= needed;
      levelUp();
      currentHero.xp = 0; // XP "reinicia" para o próximo nível
    } else {
      // Ganha XP parcial, sem subir de nível
      currentHero.xp += remaining;
      remaining = 0;
    }
  }

  if (reason) {
    pushQuestMessage(`Você recebeu ${amount} XP (${reason}).`);
  } else {
    pushQuestMessage(`Você recebeu ${amount} XP.`);
  }

  saveHeroToStorage(currentHero);
  renderHeroStatus(currentHero);
}

function levelUp() {
  if (!currentHero) return;

  const pointsGain = 2;
  currentHero.level += 1;
  currentHero.attributePoints =
    (currentHero.attributePoints || 0) + pointsGain;

  recalcResourcesFromStats(currentHero);

  pushQuestMessage(
    `Você subiu para o nível ${currentHero.level}! Recebeu ${pointsGain} pontos de atributo.`
  );
}

// Gasto de pontos de atributo
function spendAttributePoint(attrKey) {
  if (!currentHero) return;
  if ((currentHero.attributePoints || 0) <= 0) return;

  if (typeof currentHero.stats[attrKey] !== "number") {
    currentHero.stats[attrKey] = 0;
  }

  currentHero.stats[attrKey] += 1;
  currentHero.attributePoints -= 1;

  recalcResourcesFromStats(currentHero);
  saveHeroToStorage(currentHero);
  renderHeroStatus(currentHero);

  const attrLabelMap = {
    strength: "FOR",
    agility: "AGI",
    intellect: "INT",
    vitality: "VIT",
    wisdom: "SAB",
    charisma: "CAR"
  };
  const label = attrLabelMap[attrKey] || attrKey;
  pushQuestMessage(`Você aumentou ${label} em +1.`);
}

function initAttributeButtons() {
  const buttons = document.querySelectorAll(".attr-btn");
  buttons.forEach((btn) => {
    const attr = btn.dataset.attr;
    btn.addEventListener("click", () => {
      spendAttributePoint(attr);
    });
  });
}

// =============================
// MISSÃO: CONCLUSÃO E RECOMPENSAS
// =============================

function completeQuest(id) {
  const questDef = QUESTS[id];
  if (!questDef) return;

  const state = getQuestState(id);
  if (state.status === "completed") return;

  state.status = "completed";

  const xpGain = questDef.rewards?.xp || 0;
  const goldGain = questDef.rewards?.gold || 0;

  currentHero.gold += goldGain;

  // Mensagem de conclusão
  pushQuestMessage(
    `Missão concluída: "${questDef.title}"! (+${xpGain} XP, +${goldGain} ouro)`
  );

  // Aplica XP via sistema de level up
  gainXp(xpGain, `Missão "${questDef.title}"`);

  saveHeroToStorage(currentHero);
  saveQuestsToStorage();
  renderQuestLog();
}

// =============================
// ENGINE BASE — RPG DE TEXTO
// =============================

let sceneTextEl = null;
let sceneChoicesEl = null;

const scenes = {
  inicio: {
    text: `
      As duas luas — Selene e Kael — iluminam o céu acima de você.
      O vento traz rumores de uma presença antiga despertando…  
      Você desperta sem memórias claras, apenas a sensação de que algo o observa.
    `,
    choices: [
      { text: "Explorar a área ao redor", next: "explorar" },
      { text: "Seguir para a vila mais próxima", next: "vila" }
    ]
  },

  explorar: {
    text: `
      Você caminha pela mata silenciosa.  
      Há marcas estranhas no chão — garras? pés?  
      O Fluxo Arcano vibra levemente ao seu redor.
    `,
    choices: [
      { text: "Examinar as marcas", next: "marcas" },
      { text: "Voltar para onde acordou", next: "inicio" }
    ]
  },

  vila: {
    text: `
      A estrada leva você para Valerion, uma vila humilde,
      onde guardas patrulham com olhar desconfiado.
      O ar está tenso — como se esperassem um ataque.
    `,
    choices: [
      { text: "Perguntar aos guardas o que está acontecendo", next: "guardas" },
      { text: "Entrar na taverna local", next: "taverna" }
    ]
  },

  marcas: {
    text: `
      Ao tocar as marcas, uma onda de energia percorre sua mão.
      O Fluxo Arcano reage fortemente.
      Algo… ou alguém… deixou isso aqui recentemente.
    `,
    choices: [
      { text: "Seguir o rastro", next: "rastro" },
      { text: "Retornar à clareira", next: "inicio" }
    ]
  },

  rastro: {
    text: `
      Você segue o rastro por algum tempo até que ele se perde
      perto de um antigo marco de pedra coberto de musgo.
      Um sussurro distante parece chamar seu nome.
    `,
    choices: [
      { text: "Investigar o marco de pedra", next: "marco" },
      { text: "Ignorar o chamado e voltar para a estrada até Valerion", next: "vila" }
    ]
  },

  marco: {
    text: `
      Ao tocar o marco de pedra, símbolos antigos brilham por um instante.
      Você sente o Fluxo Arcano reagindo ao seu toque, como se o mundo
      tivesse acabado de notar sua presença.
    `,
    choices: [
      { text: "Concentrar-se na energia arcana", next: "inicio" },
      { text: "Se afastar e retornar à clareira", next: "inicio" }
    ]
  },

  guardas: {
    text: `
      Os guardas olham para você desconfiados.
      — “Estrangeiro, não é seguro aqui. Criaturas das sombras têm atacado ao anoitecer.” 
    `,
    choices: [
      { text: "Pedir mais informações", next: "infoGuardas" },
      { text: "Agradecer e seguir para a taverna", next: "taverna" }
    ],
    onEnter: () => {
      // Clima da missão, mas sem ativar ainda
    }
  },

  infoGuardas: {
    text: `
      Um dos guardas se aproxima, avaliando suas armas e postura.
      — “Se procura trabalho, fale com o capitão na taverna.
      Precisamos de toda lâmina — ou magia — que pudermos conseguir.”
    `,
    choices: [
      { text: "Ir até a taverna", next: "taverna" },
      { text: "Explorar os arredores da vila antes", next: "explorar" }
    ],
    onEnter: () => {
      // Ao receber essas informações, a missão principal é ativada
      startQuest("main_01_sombras_em_valerion");
    }
  },

  taverna: {
    text: `
      A taverna está movimentada. A música é suave, mas o clima é tenso.
      Um mercador misterioso observa você da mesa do canto.
    `,
    choices: [
      { text: "Conversar com o mercador misterioso", next: "mercador" },
      { text: "Pedir uma bebida e escutar rumores", next: "rumores" }
    ],
    onEnter: () => {
      // A missão progride ao falar com o mercador
    }
  },

  mercador: {
    text: `
      O mercador sorri levemente quando você se aproxima.
      — “Eu estava à sua espera. Heróis não chegam aqui por acaso.”
      Ele coloca um pequeno amuleto sobre a mesa, pulsando com luz fraca.
    `,
    choices: [
      { text: "Aceitar o amuleto", next: "aceitarAmuleto" },
      { text: "Recusar e voltar para o salão principal", next: "taverna" }
    ],
    onEnter: () => {
      const state = getQuestState("main_01_sombras_em_valerion");
      if (state.status === "active" && state.currentStep === 0) {
        // Avança objetivo (guardas -> mercador)
        advanceQuestStep("main_01_sombras_em_valerion");
      }
    }
  },

  aceitarAmuleto: {
    text: `
      Você segura o amuleto. Ele é frio ao toque, mas um calor estranho
      começa a pulsar do seu centro, em sincronia com seu coração.
      O mercador apenas sorri:
      — “Agora, Aethelgard também o nota.”
    `,
    choices: [
      { text: "Guardar o amuleto e retornar à taverna", next: "taverna" },
      { text: "Sair para observar as ruas de Valerion", next: "vila" }
    ],
    onEnter: () => {
      const state = getQuestState("main_01_sombras_em_valerion");
      if (state.status === "active") {
        // Aqui a gente FINALIZA a missão de vez
        completeQuest("main_01_sombras_em_valerion");
      }
    }
  },

  rumores: {
    text: `
      Você se senta ao balcão e escuta as conversas ao redor.
      Falam de criaturas nas sombras, caravanas desaparecidas
      e de um nome sussurrado com medo: Malakor.
    `,
    choices: [
      { text: "Continuar ouvindo e reunir mais informações", next: "guardas" },
      { text: "Levantar-se e sair da taverna", next: "explorar" }
    ]
  }
};

function loadScene(sceneName) {
  const scene = scenes[sceneName];
  if (!scene || !sceneTextEl || !sceneChoicesEl) return;

  sceneTextEl.innerHTML = scene.text;
  sceneChoicesEl.innerHTML = "";

  // Se a cena tiver um gatilho (tipo onEnter para missão), dispara
  if (typeof scene.onEnter === "function") {
    scene.onEnter();
  }

  scene.choices.forEach((choice) => {
    const btn = document.createElement("button");
    btn.className = "rpg-choice-btn";
    btn.innerText = choice.text;
    btn.onclick = () => loadScene(choice.next);
    sceneChoicesEl.appendChild(btn);
  });
}

function initTextRpgEngine() {
  sceneTextEl = document.querySelector("#rpg-scene-text");
  sceneChoicesEl = document.querySelector("#rpg-choices");
  if (!sceneTextEl || !sceneChoicesEl) return;
  loadScene("inicio");
}

// =============================
// INICIALIZAÇÃO GERAL
// =============================

document.addEventListener("DOMContentLoaded", () => {
  currentHero = loadHeroFromStorage();
  questsState = loadQuestsFromStorage();

  renderHeroStatus(currentHero);
  renderQuestLog();
  initTextRpgEngine();
  initAttributeButtons();

  // --- Controles do menu de navegação do jogo (mobile + submenu) ---
  const navToggle = document.querySelector(".game-nav-toggle");
  const mainMenu = document.querySelector("#game-main-menu-list");
  const adventuresItem = document.querySelector(".has-submenu > a");
  const hasSubmenuLi = document.querySelector(".has-submenu");

  if (navToggle && mainMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = mainMenu.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  if (adventuresItem && hasSubmenuLi) {
    adventuresItem.addEventListener("click", (event) => {
      event.preventDefault();
      const isOpen = hasSubmenuLi.classList.toggle("open");
      adventuresItem.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }
});

// =============================
// CONSTANTES DE STORAGE
// =============================
const HERO_STORAGE_KEY = "aethelgard_hero";
const QUESTS_STORAGE_KEY = "aethelgard_quests";

// =============================
// DEFINIÇÃO DE MISSÕES (QUESTS)
// =============================

const QUESTS = {
  // MISSÃO 01 (Tutorial)
  main_01_sombras_em_valerion: {
    id: "main_01_sombras_em_valerion",
    title: "Sombras em Valerion",
    shortDescription: "Os guardas de Valerion estão preocupados com ataques de criaturas sombrias.",
    steps: [
      "Fale com os guardas na entrada de Valerion.",
      "Receba mais informações sobre os ataques e sobre o capitão na taverna.",
      "Encontre o mercador misterioso e aceite o amuleto estranho."
    ],
    rewards: { xp: 50, gold: 15 }
  },

  // MISSÃO SECUNDÁRIA 01 (Cemitério)
  side_01_lamento_dos_mortos: {
    id: "side_01_lamento_dos_mortos",
    title: "O Lamento dos Mortos",
    shortDescription: "Investigue as luzes estranhas e vultos no Cemitério Antigo de Valerion.",
    steps: [
      "Vá até a entrada do Cemitério Antigo.",
      "Consiga entrar no cemitério (Força ou Agilidade) e investigue o interior.",
      "Derrote a fonte da perturbação no Mausoléu."
    ],
    rewards: { xp: 80, gold: 25 }
  },

  // MISSÃO PRINCIPAL 02 (Culto)
  main_02_eco_das_sombras: {
    id: "main_02_eco_das_sombras",
    title: "Eco das Sombras",
    shortDescription: "O diário encontrado no cemitério aponta para um santuário oculto nos arredores.",
    steps: [
      "Investigue a Floresta das Brumas em busca do esconderijo do culto.",
      "Encontre a entrada oculta do Santuário (Teste de Sabedoria ou Combate).",
      "Derrote o Mestre dos Rituais para interromper a invocação."
    ],
    rewards: { xp: 150, gold: 50 }
  },

  // MISSÃO SECUNDÁRIA 02 (Caravana)
  side_02_caravana_perdida: {
    id: "side_02_caravana_perdida",
    title: "A Caravana Perdida",
    shortDescription: "Mercadores relatam que uma caravana desapareceu na estrada leste.",
    steps: [
      "Vá até a estrada leste e localize os destroços da caravana.",
      "Elimine a besta corrompida que está guardando os espólios.",
      "Recupere os suprimentos e avise o mercador na taverna."
    ],
    rewards: { xp: 80, gold: 30 }
  }
};

// =============================
// DEFINIÇÃO DE INIMIGOS (ENEMIES)
// =============================

const ENEMIES = {
  // Inimigos Iniciais
  sombra_fraca: {
    id: "sombra_fraca",
    name: "Criatura das Sombras",
    maxHp: 30, attackMin: 4, attackMax: 9, agility: 6, xp: 20, gold: 5
  },
  
  // Inimigos do Cemitério
  lobo_corrompido: {
    id: "lobo_corrompido",
    name: "Lobo das Sombras",
    maxHp: 25, attackMin: 3, attackMax: 7, agility: 12, xp: 30, gold: 0
  },
  vulto_menor: {
    id: "vulto_menor",
    name: "Vulto Atormentado",
    maxHp: 40, attackMin: 6, attackMax: 14, agility: 4, xp: 50, gold: 12
  },

  // Inimigos da Floresta e Culto
  culto_acolito: {
    id: "culto_acolito",
    name: "Acólito do Olho Vazio",
    maxHp: 35, attackMin: 5, attackMax: 10, agility: 7, xp: 45, gold: 15
  },
  javali_corrompido: {
    id: "javali_corrompido",
    name: "Javali das Sombras",
    maxHp: 55, attackMin: 4, attackMax: 8, agility: 5, xp: 50, gold: 0
  },
  lider_cultista: {
    id: "lider_cultista",
    name: "Mestre dos Rituais",
    maxHp: 70, attackMin: 8, attackMax: 16, agility: 9, xp: 150, gold: 60
  }
};

// =============================
// REGRAS DE XP / LEVEL
// =============================

function xpNeededForNextLevel(level) {
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
    level: 1, xp: 0, attributePoints: 0, gold: 0,
    stats: { strength: 6, agility: 6, intellect: 6, vitality: 6, wisdom: 6, charisma: 6 },
    resources: { hp: 60, maxHp: 60, mana: 40, maxMana: 40, energy: 60, maxEnergy: 60 },
    appearance: { gender: null, imageSrc: "" }
  };
}

function recalcResourcesFromStats(hero) {
  const vit = hero.stats.vitality ?? 6;
  const int = hero.stats.intellect ?? 6;
  const agi = hero.stats.agility ?? 6;

  hero.resources.maxHp = vit * 10;
  hero.resources.maxMana = int * 8;
  hero.resources.maxEnergy = agi * 10;

  if (hero.resources.hp > hero.resources.maxHp) hero.resources.hp = hero.resources.maxHp;
  if (hero.resources.mana > hero.resources.maxMana) hero.resources.mana = hero.resources.maxMana;
  if (hero.resources.energy > hero.resources.maxEnergy) hero.resources.energy = hero.resources.maxEnergy;
}

function normalizeHero(hero) {
  if (!hero.stats) hero.stats = { strength: 6, agility: 6, intellect: 6, vitality: 6, wisdom: 6, charisma: 6 };
  if (!hero.resources) hero.resources = { hp: 60, maxHp: 60, mana: 40, maxMana: 40, energy: 60, maxEnergy: 60 };
  if (typeof hero.level !== "number") hero.level = 1;
  if (typeof hero.xp !== "number") hero.xp = 0;
  if (typeof hero.attributePoints !== "number") hero.attributePoints = 0;
  if (!hero.appearance) hero.appearance = { gender: null, imageSrc: "" };

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
    return normalizeHero(JSON.parse(raw));
  } catch (e) {
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
  const percent = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  barElement.style.width = percent + "%";
  textElement.textContent = `${Math.floor(current)} / ${max}`;
}

function renderHeroStatus(hero) {
  // Painel principal
  document.querySelector("#hero-name").textContent = hero.name;
  document.querySelector("#hero-race-region").textContent = `${hero.race} • ${hero.region}`;
  document.querySelector("#hero-level").textContent = `Nível ${hero.level}`;
  document.querySelector("#hero-xp").textContent = `XP: ${hero.xp}`;
  document.querySelector("#hero-gold-amount").textContent = hero.gold;

  document.querySelector("#hero-str").textContent = hero.stats.strength;
  document.querySelector("#hero-agi").textContent = hero.stats.agility;
  document.querySelector("#hero-int").textContent = hero.stats.intellect;
  document.querySelector("#hero-vit").textContent = hero.stats.vitality;

  updateBar(document.querySelector("#hero-hp-bar"), document.querySelector("#hero-hp-text"), hero.resources.hp, hero.resources.maxHp);
  updateBar(document.querySelector("#hero-mana-bar"), document.querySelector("#hero-mana-text"), hero.resources.mana, hero.resources.maxMana);
  updateBar(document.querySelector("#hero-energy-bar"), document.querySelector("#hero-energy-text"), hero.resources.energy, hero.resources.maxEnergy);
  
  const xpNeeded = xpNeededForNextLevel(hero.level);
  updateBar(document.querySelector("#hero-xp-bar"), document.querySelector("#hero-xp-bar-text"), hero.xp, xpNeeded);

  const apTextEl = document.querySelector("#hero-attribute-points-text");
  if (apTextEl) apTextEl.textContent = `Pontos de atributo disponíveis: ${hero.attributePoints}`;
  
  document.querySelectorAll(".attr-btn").forEach((btn) => {
    btn.disabled = hero.attributePoints <= 0;
  });

  // Header fixo
  document.querySelector("#player-char-name").textContent = hero.name;
  document.querySelector("#player-gold").textContent = `Ouro: ${hero.gold}`;
  if (hero.appearance?.imageSrc) document.querySelector("#player-char-img").src = hero.appearance.imageSrc;

  // Atualiza barras do header (se existirem com IDs únicos ou duplicados corretamente)
  // Assumindo que nojogo.html usa estrutura onde querySelector acha os do header ou precisamos ser mais específicos
  // Como o CSS do header usa #hp-bar, vamos garantir que funcione
  const headerHpBar = document.getElementById("hp-bar");
  if (headerHpBar) updateBar(headerHpBar, document.getElementById("hp-value"), hero.resources.hp, hero.resources.maxHp);
  
  const headerManaBar = document.getElementById("mana-bar");
  if (headerManaBar) updateBar(headerManaBar, document.getElementById("mana-value"), hero.resources.mana, hero.resources.maxMana);
  
  const headerEnergyBar = document.getElementById("energy-bar");
  if (headerEnergyBar) updateBar(headerEnergyBar, document.getElementById("energy-value"), hero.resources.energy, hero.resources.maxEnergy);
}

let currentHero = null;

// =============================
// SISTEMA DE MISSÕES
// =============================

let questsState = {};

function loadQuestsFromStorage() {
  const raw = localStorage.getItem(QUESTS_STORAGE_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (e) { return {}; }
}

function saveQuestsToStorage() {
  localStorage.setItem(QUESTS_STORAGE_KEY, JSON.stringify(questsState));
}

function getQuestState(id) {
  if (!questsState[id]) questsState[id] = { status: "locked", currentStep: 0 };
  return questsState[id];
}

function pushQuestMessage(text, type="info") {
  const msgContainer = document.querySelector("#quest-messages");
  if (!msgContainer) return;
  const p = document.createElement("p");
  p.innerHTML = text;
  if(type === "erro") p.style.color = "#e74c3c";
  msgContainer.prepend(p);
}

function renderQuestLog() {
  const activeContainer = document.querySelector("#active-quest");
  const completedContainer = document.querySelector("#completed-quests");
  if (!activeContainer || !completedContainer) return;

  activeContainer.innerHTML = "";
  completedContainer.innerHTML = "";

  const questIds = Object.keys(questsState);
  const activeIds = questIds.filter((id) => questsState[id].status === "active");
  const completedIds = questIds.filter((id) => questsState[id].status === "completed");

  if (activeIds.length === 0) {
    activeContainer.innerHTML = `<p class="quest-empty">Você ainda não possui missões ativas.</p>`;
  } else {
    activeIds.forEach(id => {
        const questDef = QUESTS[id];
        const questState = questsState[id];
        if (questDef) {
            const div = document.createElement('div');
            div.style.marginBottom = "15px";
            div.style.borderBottom = "1px dashed #444";
            div.style.paddingBottom = "10px";
            const currentStepText = questDef.steps[questState.currentStep] || "Conclua a missão.";
            div.innerHTML = `
                <h4 style="color:#c89b3c">${questDef.title}</h4>
                <p style="font-size:0.85rem; opacity:0.8">${questDef.shortDescription}</p>
                <p style="margin-top:5px"><strong>Objetivo:</strong> ${currentStepText}</p>
            `;
            activeContainer.appendChild(div);
        }
    });
  }

  if (completedIds.length > 0) {
    const title = document.createElement("h4");
    title.textContent = "Concluídas";
    completedContainer.appendChild(title);
    const ul = document.createElement("ul");
    completedIds.forEach((id) => {
      const questDef = QUESTS[id];
      const li = document.createElement("li");
      li.textContent = questDef ? questDef.title : id;
      li.style.color = "#888";
      ul.appendChild(li);
    });
    completedContainer.appendChild(ul);
  }
}

function startQuest(id) {
  const questDef = QUESTS[id];
  if (!questDef) return;
  const state = getQuestState(id);
  if (state.status === "active" || state.status === "completed") return;

  state.status = "active";
  state.currentStep = 0;
  pushQuestMessage(`📜 Nova missão: <strong>${questDef.title}</strong>`);
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
    pushQuestMessage(`📝 Objetivo atualizado: ${questDef.steps[state.currentStep]}`);
  } else {
    completeQuest(id);
    return;
  }
  saveQuestsToStorage();
  renderQuestLog();
}

function completeQuest(id) {
  const questDef = QUESTS[id];
  if (!questDef) return;
  const state = getQuestState(id);
  if (state.status === "completed") return;

  state.status = "completed";
  const xpGain = questDef.rewards?.xp || 0;
  const goldGain = questDef.rewards?.gold || 0;

  currentHero.gold += goldGain;
  pushQuestMessage(`✅ Missão concluída: <strong>${questDef.title}</strong>! (+${xpGain} XP, +${goldGain} Ouro)`);
  gainXp(xpGain, `Missão "${questDef.title}"`);
  
  saveHeroToStorage(currentHero);
  saveQuestsToStorage();
  renderQuestLog();
}

// =============================
// XP / LEVEL UP
// =============================

function gainXp(amount, reason) {
  if (!currentHero) return;
  let remaining = amount;
  while (remaining > 0) {
    const needed = xpNeededForNextLevel(currentHero.level) - currentHero.xp;
    if (remaining >= needed) {
      currentHero.xp += needed;
      remaining -= needed;
      levelUp();
      currentHero.xp = 0;
    } else {
      currentHero.xp += remaining;
      remaining = 0;
    }
  }
  saveHeroToStorage(currentHero);
  renderHeroStatus(currentHero);
}

function levelUp() {
  if (!currentHero) return;
  const pointsGain = 2;
  currentHero.level += 1;
  currentHero.attributePoints = (currentHero.attributePoints || 0) + pointsGain;
  
  // Cura completa
  recalcResourcesFromStats(currentHero);
  currentHero.resources.hp = currentHero.resources.maxHp;
  currentHero.resources.mana = currentHero.resources.maxMana;
  currentHero.resources.energy = currentHero.resources.maxEnergy;

  pushQuestMessage(`🌟 <strong>LEVEL UP!</strong> Nível ${currentHero.level}! (+${pointsGain} pts atributo)`);
}

function spendAttributePoint(attrKey) {
  if (!currentHero) return;
  if ((currentHero.attributePoints || 0) <= 0) return;

  currentHero.stats[attrKey] += 1;
  currentHero.attributePoints -= 1;

  recalcResourcesFromStats(currentHero);
  saveHeroToStorage(currentHero);
  renderHeroStatus(currentHero);

  const labels = { strength: "FOR", agility: "AGI", intellect: "INT", vitality: "VIT" };
  pushQuestMessage(`Atributo aumentado: <strong>${labels[attrKey] || attrKey}</strong>.`);
}

function initAttributeButtons() {
  document.querySelectorAll(".attr-btn").forEach((btn) => {
    btn.addEventListener("click", () => spendAttributePoint(btn.dataset.attr));
  });
}

// =============================
// SISTEMA DE COMBATE
// =============================

let combatState = null;

function startCombat(enemyId, callbacks) {
    const enemyProto = ENEMIES[enemyId];
    if (!enemyProto) return;

    combatState = {
        enemy: { ...enemyProto, hp: enemyProto.maxHp },
        callbacks: callbacks || {},
        heroDefending: false,
        log: []
    };
    renderCombatUI();
}

function renderCombatUI() {
    if (!combatState) return;
    const enemy = combatState.enemy;
    const hero = currentHero;
    const sceneTextEl = document.querySelector("#rpg-scene-text");
    const sceneChoicesEl = document.querySelector("#rpg-choices");

    let html = `
        <div style="border: 2px solid #c0392b; padding: 15px; border-radius: 8px; background: rgba(50, 10, 10, 0.3);">
            <h3 style="color: #e74c3c; margin-top:0;">⚔️ COMBATE: ${enemy.name}</h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <div><strong>${hero.name}</strong><br>HP: <span style="color:${hero.resources.hp < hero.resources.maxHp*0.3 ? 'red' : '#2ecc71'}">${Math.floor(hero.resources.hp)}</span> / ${hero.resources.maxHp}</div>
                <div style="text-align:right;"><strong>${enemy.name}</strong><br>HP: <span style="color:#e74c3c">${enemy.hp}</span> / ${enemy.maxHp}</div>
            </div>
            <div style="width: 100%; background: #333; height: 10px; border-radius: 5px; overflow: hidden; margin-bottom: 15px;">
                <div style="width: ${(enemy.hp / enemy.maxHp) * 100}%; background: #c0392b; height: 100%;"></div>
            </div>
            <div style="max-height: 150px; overflow-y: auto; font-size: 0.9rem; border-top: 1px solid #555; padding-top: 10px;">
                ${combatState.log.map(l => `<p style="margin: 4px 0;">${l}</p>`).join('')}
            </div>
        </div>
    `;
    sceneTextEl.innerHTML = html;
    
    sceneChoicesEl.innerHTML = "";
    
    const actions = [
        { t: "⚔️ Atacar (FOR)", a: "attack" },
        { t: "🛡️ Defender", a: "defend" },
        { t: "🏃 Fugir (AGI)", a: "flee" }
    ];

    actions.forEach(act => {
        const btn = document.createElement("button");
        btn.className = "rpg-choice-btn";
        btn.innerHTML = act.t;
        btn.onclick = () => combatPlayerTurn(act.a);
        sceneChoicesEl.appendChild(btn);
    });
}

function combatLog(msg) {
    if(combatState) {
        combatState.log.unshift(msg);
        if(combatState.log.length > 5) combatState.log.pop();
    }
}

function combatPlayerTurn(action) {
    if(!combatState) return;
    const hero = currentHero;
    const enemy = combatState.enemy;
    combatState.heroDefending = false;

    if (action === "attack") {
        const roll = Math.floor(Math.random() * 20) + 1;
        const hitChance = roll + hero.stats.strength;
        const defenseClass = 10 + enemy.agility;

        if (hitChance >= defenseClass) {
            const dmg = hero.stats.strength + Math.floor(Math.random() * 4) + 1;
            enemy.hp -= dmg;
            combatLog(`Você acertou ${enemy.name} causando <strong>${dmg}</strong> de dano!`);
        } else {
            combatLog(`Você tentou atacar, mas o inimigo esquivou!`);
        }
    } else if (action === "defend") {
        combatState.heroDefending = true;
        combatLog(`Você assume uma postura defensiva.`);
    } else if (action === "flee") {
        const roll = Math.floor(Math.random() * 20) + 1;
        if ((roll + hero.stats.agility) > (10 + enemy.agility)) {
            endCombat("escape");
            return;
        } else {
            combatLog(`Falha ao tentar fugir!`);
        }
    }

    if (enemy.hp <= 0) {
        endCombat("victory");
    } else {
        setTimeout(combatEnemyTurn, 800);
        renderCombatUI();
    }
}

function combatEnemyTurn() {
    if(!combatState) return;
    const hero = currentHero;
    const enemy = combatState.enemy;

    const roll = Math.floor(Math.random() * 20) + 1;
    const hitChance = roll + enemy.agility;
    const heroAC = 10 + hero.stats.agility;

    if (hitChance >= heroAC) {
        let dmg = Math.floor(Math.random() * (enemy.attackMax - enemy.attackMin + 1)) + enemy.attackMin;
        if (combatState.heroDefending) {
            dmg = Math.floor(dmg / 2);
            combatLog(`${enemy.name} ataca, mas sua defesa reduziu o dano para <strong>${dmg}</strong>!`);
        } else {
            combatLog(`${enemy.name} acertou você causando <strong>${dmg}</strong> de dano!`);
        }
        hero.resources.hp -= dmg;
    } else {
        combatLog(`${enemy.name} atacou, mas você esquivou!`);
    }

    renderHeroStatus(hero);
    saveHeroToStorage(hero);

    if (hero.resources.hp <= 0) {
        endCombat("defeat");
    } else {
        renderCombatUI();
    }
}

function endCombat(result) {
    const callbacks = combatState.callbacks;
    const enemy = combatState.enemy;
    
    if (result === "victory") {
        currentHero.gold += enemy.gold;
        pushQuestMessage(`Vitória! +${enemy.xp} XP, +${enemy.gold} Ouro.`);
        gainXp(enemy.xp, `Derrotou ${enemy.name}`);
        loadScene(callbacks.onVictory || "inicio");
    } else if (result === "escape") {
        pushQuestMessage("Você escapou com vida.");
        loadScene(callbacks.onEscape || "inicio");
    } else if (result === "defeat") {
        currentHero.resources.hp = Math.floor(currentHero.resources.maxHp * 0.2);
        pushQuestMessage("Você foi derrotado e arrastado para longe...");
        saveHeroToStorage(currentHero);
        renderHeroStatus(currentHero);
        loadScene(callbacks.onDefeat || "inicio");
    }
    combatState = null;
}

// =============================
// ENGINE BASE — RPG DE TEXTO (CENAS)
// =============================

let sceneTextEl = null;
let sceneChoicesEl = null;

const scenes = {
  // CENA INICIAL
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
      { text: "Concentrar-se na energia arcana (Teste INT)", next: "marcoTesteInt" },
      { text: "Se afastar e retornar à clareira", next: "inicio" }
    ]
  },

  marcoTesteInt: {
      text: "Você tenta decifrar a energia pulsante...",
      choices: [],
      onEnter: () => {
          const roll = Math.floor(Math.random() * 20) + 1;
          const total = roll + currentHero.stats.intellect;
          const dif = 12;
          if(total >= dif) {
              pushQuestMessage(`Teste INT: Sucesso (${total} vs ${dif}). Você sente uma direção clara.`);
              gainXp(10, "Conhecimento Arcano");
              loadScene("vila");
          } else {
              pushQuestMessage(`Teste INT: Falha (${total} vs ${dif}). A energia é caótica demais.`);
              currentHero.resources.hp -= 5;
              renderHeroStatus(currentHero);
              loadScene("inicio");
          }
      }
  },

  guardas: {
    text: `
      Os guardas olham para você desconfiados.
      — “Estrangeiro, não é seguro aqui. Criaturas das sombras têm atacado ao anoitecer.” 
    `,
    choices: [
      { text: "Pedir mais informações", next: "infoGuardas" },
      { text: "Agradecer e seguir para a taverna", next: "taverna" }
    ]
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
    onEnter: () => startQuest("main_01_sombras_em_valerion")
  },

  taverna: {
    text: `
      A taverna está movimentada. A música é suave, mas o clima é tenso.
      Um mercador misterioso observa você da mesa do canto.
      <br>Ouve-se rumores sobre o cemitério antigo...
    `,
    choices: [
      { text: "Conversar com o mercador misterioso", next: "mercador" },
      { text: "Pedir uma bebida e escutar rumores", next: "rumores" },
      { text: "Sair da taverna e investigar os rumores lá fora", next: "saida_taverna" }
    ]
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
      if (state.status === "active") completeQuest("main_01_sombras_em_valerion");
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
      { text: "Levantar-se e sair da taverna", next: "saida_taverna" }
    ]
  },

  // --- NOVAS CENAS: ARCO DO CEMITÉRIO ---

  saida_taverna: {
    text: `
      A noite em Valerion é fria. As duas luas, Selene (a prateada) e Kael (a rubra),
      criam sombras duplas no chão de terra batida.
      <br><br>
      Um guarda veterano se aproxima, parecendo exausto.
      — "Ei, você. O Capitão disse que você lidou com aquelas sombras. 
      Temos um problema maior no Cemitério Antigo, ao norte. 
      Vultos, luzes estranhas... Meus homens estão com medo de ir lá."
    `,
    choices: [
      { text: "Aceitar investigar o Cemitério", next: "cemiterio_entrada" },
      { text: "Ignorar e voltar para a segurança da vila", next: "vila" }
    ],
    onEnter: () => {
      startQuest("side_01_lamento_dos_mortos");
    }
  },

  cemiterio_entrada: {
    text: `
      O portão de ferro do Cemitério Antigo está retorcido, coberto por vinhas negras que parecem pulsar.
      O ar aqui é pesado, e o Fluxo Arcano parece estático, corrompido.
      <br><br>
      O portão está emperrado. Você precisa de força bruta para abri-lo, ou agilidade para escalar o muro quebrado ao lado.
    `,
    choices: [
      { text: "[FOR] Tentar arrombar o portão (Dificuldade 10)", next: "teste_forca_portao" },
      { text: "[AGI] Escalar o muro lateral (Dificuldade 10)", next: "teste_agi_muro" },
      { text: "Voltar para Valerion", next: "vila" }
    ]
  },

  teste_forca_portao: {
    text: "Você segura as barras frias de ferro e tensiona seus músculos...",
    choices: [],
    onEnter: () => {
      const roll = Math.floor(Math.random() * 20) + 1;
      const total = roll + currentHero.stats.strength;
      
      if (total >= 10) {
        pushQuestMessage(`Teste de FOR: Sucesso! (${total} vs 10)`);
        loadScene("cemiterio_interior");
      } else {
        pushQuestMessage(`Teste de FOR: Falha. (${total} vs 10)`);
        loadScene("cemiterio_falha_entrada");
      }
    }
  },

  teste_agi_muro: {
    text: "Você busca apoio nas pedras soltas do muro para pular...",
    choices: [],
    onEnter: () => {
      const roll = Math.floor(Math.random() * 20) + 1;
      const total = roll + currentHero.stats.agility;
      
      if (total >= 10) {
        pushQuestMessage(`Teste de AGI: Sucesso! (${total} vs 10)`);
        loadScene("cemiterio_interior");
      } else {
        pushQuestMessage(`Teste de AGI: Falha. (${total} vs 10)`);
        loadScene("cemiterio_falha_entrada");
      }
    }
  },

  cemiterio_falha_entrada: {
    text: `
      Você falha em sua tentativa. O esforço faz barulho demais ou você escorrega,
      atraindo a atenção de algo que vigiava a entrada.
      Um Lobo Corrompido salta das sombras!
    `,
    choices: [
      { text: "Preparar para lutar!", next: "combate_lobo" }
    ]
  },

  combate_lobo: {
    text: "A besta rosna, seus olhos brilhando com uma luz não natural.",
    choices: [],
    onEnter: () => {
      startCombat("lobo_corrompido", { 
        onVictory: "cemiterio_interior", 
        onEscape: "vila", 
        onDefeat: "vila" 
      });
    }
  },

  cemiterio_interior: {
    text: `
      Você está dentro. Lápides antigas, marcadas com o idioma dos Primeiros Homens,
      estão reviradas.
      No centro, uma névoa esverdeada se forma sobre um mausoléu.
      Você sente a presença de Malakor sussurrando...
    `,
    choices: [
      { text: "Investigar o mausoléu central", next: "mausoleu_combate" },
      { text: "Procurar pistas nas lápides ao redor", next: "pistas_lapides" }
    ],
    onEnter: () => {
      const state = getQuestState("side_01_lamento_dos_mortos");
      if (state.status === "active" && state.currentStep === 0) {
        advanceQuestStep("side_01_lamento_dos_mortos");
      }
    }
  },

  pistas_lapides: {
    text: `
      Examinando as lápides, você encontra inscrições profanadas recentemente.
      Alguém desenhou o símbolo do "Olho Vazio" sobre os nomes dos mortos.
      Isso confirma: há um cultista ou necromante agindo aqui.
      Você encontra uma pequena bolsa de ouro esquecida pelos profanadores.
    `,
    choices: [
      { text: "Ir para o mausoléu", next: "mausoleu_combate" }
    ],
    onEnter: () => {
      currentHero.gold += 10;
      pushQuestMessage("Você encontrou 10 ouro.");
      saveHeroToStorage(currentHero);
      renderHeroStatus(currentHero);
    }
  },

  mausoleu_combate: {
    text: `
      Diante do mausoléu, uma figura etérea flutua. Não é um fantasma comum,
      mas um fragmento de alma distorcido pela Sombra.
      Ele guarda a entrada para o subterrâneo.
    `,
    choices: [],
    onEnter: () => {
      startCombat("vulto_menor", { 
        onVictory: "mausoleu_vitoria", 
        onEscape: "cemiterio_interior", 
        onDefeat: "cemiterio_interior" 
      });
    }
  },

  mausoleu_vitoria: {
    text: `
      O vulto se dissipa em um grito agudo, deixando para trás apenas poeira e silêncio.
      A névoa verde começa a se dissipar.
      Você encontra um diário antigo caído na entrada do mausoléu.
    `,
    choices: [
      { text: "Ler o diário e voltar para Valerion", next: "fim_missao_cemiterio" }
    ]
  },

  fim_missao_cemiterio: {
    text: `
      O diário fala de rituais para enfraquecer o véu entre Aethelgard e o Plano das Sombras.
      Você retorna aos guardas com a notícia de que a ameaça imediata foi contida,
      mas o perigo real está apenas começando.
    `,
    choices: [
      { text: "Voltar para Valerion relatar o ocorrido", next: "pos_cemiterio_vila" }
    ],
    onEnter: () => {
      completeQuest("side_01_lamento_dos_mortos");
    }
  },

  // --- NOVAS CENAS: CONTINUAÇÃO (CARAVANA E CULTO) ---

  pos_cemiterio_vila: {
    text: `
      De volta a Valerion, o clima não melhorou. O diário que você encontrou no cemitério
      menciona um "Santuário na Floresta das Brumas".
      O Capitão da Guarda se aproxima:
      — "Se o que diz é verdade, eles estão tentando abrir uma fenda maior.
      Você precisa encontrar esse lugar antes que a lua Kael atinja o zênite."
    `,
    choices: [
      { text: "Partir para a Floresta das Brumas (Missão Principal)", next: "floresta_brumas_entrada" },
      { text: "Perguntar sobre outros problemas na região", next: "gancho_caravana" },
      { text: "Ir à taverna descansar", next: "taverna" }
    ],
    onEnter: () => {
      startQuest("main_02_eco_das_sombras");
    }
  },

  gancho_caravana: {
    text: `
      O Capitão suspira:
      — "Além do culto, bestas estranhas têm atacado a estrada leste.
      Perdemos uma caravana de suprimentos ontem. Se puder verificar, pagaremos bem."
    `,
    choices: [
      { text: "Investigar a estrada leste (Missão Secundária)", next: "estrada_leste_destrocos" },
      { text: "Focar na ameaça do culto", next: "floresta_brumas_entrada" }
    ],
    onEnter: () => {
      startQuest("side_02_caravana_perdida");
    }
  },

  // --- ARCO: CARAVANA PERDIDA ---
  estrada_leste_destrocos: {
    text: `
      Você encontra a carroça tombada. Caixas quebradas, frutas podres e...
      marcas de presas enormes na madeira.
      Um grunhido baixo vem dos arbustos. Um Javali, com olhos negros como piche e veias pulsantes, surge.
    `,
    choices: [
      { text: "Lutar contra a besta!", next: "combate_javali" }
    ],
    onEnter: () => {
        advanceQuestStep("side_02_caravana_perdida");
    }
  },

  combate_javali: {
    text: "O javali avança, derrubando pequenas árvores no caminho.",
    choices: [],
    onEnter: () => {
      startCombat("javali_corrompido", {
        onVictory: "javali_vitoria",
        onEscape: "vila",
        onDefeat: "vila"
      });
    }
  },

  javali_vitoria: {
    text: `
      A besta cai, dissolvendo-se parcialmente em fumaça negra.
      Você recupera uma caixa de suprimentos intacta marcada com o selo de Valerion.
    `,
    choices: [
      { text: "Levar os suprimentos de volta à Vila", next: "vila_recompensa_caravana" }
    ]
  },

  vila_recompensa_caravana: {
    text: `
      O mercador na taverna fica aliviado ao ver os suprimentos.
      — "Obrigado! Pensei que perderia tudo para aquelas coisas."
    `,
    choices: [
      { text: "Voltar ao centro da Vila", next: "pos_cemiterio_vila" }
    ],
    onEnter: () => {
      completeQuest("side_02_caravana_perdida");
    }
  },

  // --- ARCO: ECO DAS SOMBRAS (MAIN 02) ---
  floresta_brumas_entrada: {
    text: `
      A Floresta das Brumas faz jus ao nome. A visibilidade é baixa.
      O diário menciona um "caminho onde o musgo brilha em roxo".
      Você precisa de olhos atentos para não se perder.
    `,
    choices: [
      { text: "[SAB] Tentar rastrear o caminho mágico (Dif. 12)", next: "teste_sab_floresta" },
      { text: "[INT] Tentar decifrar o mapa do diário (Dif. 12)", next: "teste_int_mapa" },
      { text: "Andar aleatoriamente", next: "floresta_emboscada" }
    ]
  },

  teste_sab_floresta: {
    text: "Você fecha os olhos e tenta sentir a dissonância no Fluxo Arcano...",
    choices: [],
    onEnter: () => {
      const roll = Math.floor(Math.random() * 20) + 1;
      const total = roll + currentHero.stats.wisdom; // Usa SABEDORIA
      if (total >= 12) {
        pushQuestMessage(`Teste SAB: Sucesso (${total} vs 12). Você encontra o rastro.`);
        loadScene("santuario_oculto_entrada");
      } else {
        pushQuestMessage(`Teste SAB: Falha (${total} vs 12). Você se perde e atrai atenção.`);
        loadScene("floresta_emboscada");
      }
    }
  },

  teste_int_mapa: {
    text: "Você estuda as anotações complexas do cultista...",
    choices: [],
    onEnter: () => {
      const roll = Math.floor(Math.random() * 20) + 1;
      const total = roll + currentHero.stats.intellect; // Usa INTELECTO
      if (total >= 12) {
        pushQuestMessage(`Teste INT: Sucesso (${total} vs 12). O padrão fica claro.`);
        loadScene("santuario_oculto_entrada");
      } else {
        pushQuestMessage(`Teste INT: Falha (${total} vs 12). As anotações não fazem sentido.`, "erro");
        loadScene("floresta_emboscada");
      }
    }
  },

  floresta_emboscada: {
    text: `
      Você anda em círculos por horas. De repente, dois vultos encapuzados surgem da neblina.
      — "O Mestre não deve ser perturbado!"
    `,
    choices: [
      { text: "Defender-se!", next: "combate_acolito_floresta" }
    ]
  },

  combate_acolito_floresta: {
    text: "Os acólitos sacam adagas rituais.",
    choices: [],
    onEnter: () => {
      startCombat("culto_acolito", {
        onVictory: "santuario_oculto_entrada", // Se vencer, acha o caminho
        onEscape: "vila",
        onDefeat: "vila"
      });
    }
  },

  santuario_oculto_entrada: {
    text: `
      Você chega a uma clareira onde as árvores parecem sangrar seiva negra.
      Uma entrada de pedra leva ao subsolo. Cânticos ecoam lá de dentro.
      Você encontrou o Santuário.
    `,
    choices: [
      { text: "Entrar e confrontar o líder", next: "santuario_interno" },
      { text: "Voltar para Vila (preparar-se)", next: "vila" }
    ],
    onEnter: () => {
      advanceQuestStep("main_02_eco_das_sombras");
    }
  },

  santuario_interno: {
    text: `
      O interior é iluminado por tochas de fogo frio.
      No altar, o Mestre dos Rituais segura um orbe escuro.
      — "Tarde demais, herói. Malakor já viu este mundo através da fenda!"
    `,
    choices: [
      { text: "Lutar contra o Mestre dos Rituais", next: "combate_boss_culto" }
    ]
  },

  combate_boss_culto: {
    text: "O líder do culto canaliza energia sombria em suas mãos.",
    choices: [],
    onEnter: () => {
      startCombat("lider_cultista", {
        onVictory: "vitoria_culto_final",
        onEscape: "floresta_brumas_entrada", // Foge para fora
        onDefeat: "vila" // Perde e é jogado na vila
      });
    }
  },

  vitoria_culto_final: {
    text: `
      Com o líder morto, o orbe se estilhaça. Os cânticos cessam.
      Você sente que a pressão no ar diminuiu... por enquanto.
      Entre os pertences do líder, há uma carta selada com cera vermelha endereçada a "Khazad-Thorg".
    `,
    choices: [
      { text: "Pegar a carta e voltar para Valerion", next: "conclusao_arco_valerion" }
    ]
  },

  conclusao_arco_valerion: {
    text: `
      O Capitão da Guarda agradece profusamente. Valerion está segura por hora.
      Mas a carta aponta para o reino dos Anões. A corrupção se espalha.
      Sua jornada em Aethelgard apenas começou.
    `,
    choices: [
      { text: "Continuar explorando Valerion (Fim do Conteúdo Atual)", next: "vila" }
    ],
    onEnter: () => {
      completeQuest("main_02_eco_das_sombras");
    }
  }
};

function loadScene(sceneName) {
  const scene = scenes[sceneName];
  if (!scene) return;

  sceneTextEl = document.querySelector("#rpg-scene-text");
  sceneChoicesEl = document.querySelector("#rpg-choices");
  
  if (!sceneTextEl || !sceneChoicesEl) return;

  sceneTextEl.innerHTML = scene.text;
  sceneChoicesEl.innerHTML = "";

  if (typeof scene.onEnter === "function") {
    scene.onEnter();
  }

  // Se a cena tem escolhas e não é combate (combate preenche choices via UI)
  if (scene.choices && scene.choices.length > 0) {
      scene.choices.forEach((choice) => {
        const btn = document.createElement("button");
        btn.className = "rpg-choice-btn";
        btn.innerText = choice.text;
        btn.onclick = () => loadScene(choice.next);
        sceneChoicesEl.appendChild(btn);
      });
  }
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

  // Controles do menu de navegação do jogo
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

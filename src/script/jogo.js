// Chave única para salvar/ler o herói
const HERO_STORAGE_KEY = "aethelgard_hero";

// Dados do jogo (regiões e raças)
const gameData = {
  regions: [
    { id: 'sylvandell', name: 'Sylvandell', description: 'Antiga floresta élfica, cheia de mistérios e magia ancestral.', imgSrc: 'src/asstes/as_ruinas_sussurrantes.png' },
    { id: 'agulhas_congeladas', name: 'Agulhas Congeladas', description: 'Montanhas imponentes, lar de clãs resistentes e feras gélidas.', imgSrc: 'src/asstes/as_agulhas_congeladas.png' },
    { id: 'deserto_ambar', name: 'Deserto Âmbar', description: 'Vastas dunas que escondem ruínas de civilizações perdidas e perigos.', imgSrc: 'src/asstes/deserto_ambar.png' }
  ],
  races: [
    { 
      id: 'humano', name: 'Humano', 
      description: 'Versáteis e adaptáveis, os humanos podem prosperar em qualquer lugar.',
      imgBase: 'src/asstes/aventureiro_de_aethelgard.png',
      appearances: {
        male: 'src/asstes/guerreiro_fantastico_determinado.png',
        female: 'src/asstes/aventureira_curiosa.png'
      },
      attributes: { FOR: 10, DES: 10, CON: 10, INT: 10, SAB: 10, CAR: 10 },
      bonusDesc: "Humanos recebem +1 em um atributo à sua escolha ao atingir o nível 5 (simulado)."
    },
    { 
      id: 'elfo', name: 'Elfo de Sylvandell', 
      description: 'Graciosos e conectados à magia da natureza, com sentidos aguçados.',
      imgBase: 'src/asstes/elfo_gracioso_de_sylvandelli.png',
      appearances: {
        male: 'src/asstes/elfo_de_Sylvandell_masc.png',
        female: 'src/asstes/elfo_de_sylvandell_mulher.png'
      },
      attributes: { FOR: 9, DES: 12, CON: 9, INT: 11, SAB: 10, CAR: 9 },
      bonusDesc: "Elfos possuem visão no escuro e resistência natural a encantamentos."
    },
    { 
      id: 'anao', name: 'Anão das Montanhas', 
      description: 'Robustos, resilientes e mestres na forja e no combate subterrâneo.',
      imgBase: 'src/asstes/anao_das_rochosas_determinado.png',
      appearances: {
        male: 'src/asstes/anaodasrochosas.png',
        female: 'src/asstes/ana_das_montanhas_rochosas.png'
      },
      attributes: { FOR: 12, DES: 8, CON: 13, INT: 9, SAB: 10, CAR: 8 },
      bonusDesc: "Anões são resistentes a venenos e possuem conhecimento profundo de rochas e metais."
    },
    { 
      id: 'gronar', name: 'Gronar', 
      description: 'Poderosos e tribais, com uma força física imponente e instintos selvagens.',
      imgBase: 'src/asstes/retrato_de_gronar_fantasia.png',
      appearances: {
        male: 'src/asstes/retratodegronar.png',
        female: 'src/asstes/guerreira_gronar.png'
      },
      attributes: { FOR: 13, DES: 9, CON: 12, INT: 7, SAB: 8, CAR: 7 },
      bonusDesc: "Gronar podem entrar em Fúria de Batalha, aumentando seu dano temporariamente."
    },
    { 
      id: 'aetheliano', name: 'Aetheliano', 
      description: 'Seres tocados pela magia primordial, com afinidade natural para o arcano.',
      imgBase: 'src/asstes/retrato_mistic_zetheliano.png',
      appearances: {
        male: 'src/asstes/aetheliano.png',
        female: 'src/asstes/retrato_aetheliana.png'
      },
      attributes: { FOR: 8, DES: 10, CON: 8, INT: 13, SAB: 12, CAR: 9 },
      bonusDesc: "Aethelianos regeneram uma pequena quantidade de mana mais rapidamente."
    }
  ]
};

// Lê o herói salvo (se existir)
function getStoredHero() {
  const raw = localStorage.getItem(HERO_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Falha ao ler herói salvo:", e);
    return null;
  }
}

// Salva o herói no localStorage
function saveHero(hero) {
  localStorage.setItem(HERO_STORAGE_KEY, JSON.stringify(hero));
}

// Constrói o objeto de herói usado em nojogo.html a partir do newCharacter
function buildHeroFromNewCharacter(character) {
  const regionData = gameData.regions.find(r => r.id === character.region);
  const raceData = gameData.races.find(r => r.id === character.race);

  const name = (character.name || "").trim() || "Aventureiro sem nome";
  const regionName = regionData ? regionData.name : (character.region || "Terra Desconhecida");
  const raceName = raceData ? raceData.name : (character.race || "Raça Desconhecida");

  const baseAttr = (raceData && raceData.attributes) 
    ? raceData.attributes 
    : { FOR: 10, DES: 10, CON: 10, INT: 10, SAB: 10, CAR: 10 };

  const stats = {
    strength: baseAttr.FOR,
    agility: baseAttr.DES,
    vitality: baseAttr.CON,
    intellect: baseAttr.INT,
    wisdom: baseAttr.SAB,
    charisma: baseAttr.CAR
  };

  const maxHp = stats.vitality * 10;
  const maxMana = stats.intellect * 8;
  const maxEnergy = stats.agility * 10;

    return {
    name,
    race: raceName,
    region: regionName,
    level: 1,
    xp: 0,
    attributePoints: 0,
    gold: 20,
    stats,
    resources: {
      hp: maxHp,
      maxHp,
      mana: maxMana,
      maxMana,
      energy: maxEnergy,
      maxEnergy
    },
    appearance: {
      gender: character.gender,
      imageSrc: character.imageSrc
    }
  };

}

document.addEventListener('DOMContentLoaded', () => {
  // Elementos da UI
  const gameLoader = document.getElementById('game-loader');
  const welcomeScreen = document.getElementById('welcome-screen');
  const charCreationScreen = document.getElementById('char-creation-screen');
  const charSelectScreen = document.getElementById('char-select-screen');

  const btnContinueHero = document.getElementById('btn-confirmar-heroi');
  const btnCreateNewChar = document.getElementById('btn-create-new-char');
  const btnBackToWelcome = document.getElementById('btn-back-to-welcome');
  const btnBackToWelcomeFromSelect = document.getElementById('btn-back-to-welcome-from-select');

  // Elementos das Etapas de Criação
  const creationSteps = document.querySelectorAll('.creation-step');
  const stepIndicators = {
    region: document.getElementById('indicator-region'),
    race: document.getElementById('indicator-race'),
    appearance: document.getElementById('indicator-appearance'),
    confirm: document.getElementById('indicator-confirm')
  };

  const regionSelectStep = document.getElementById('region-select-step');
  const raceSelectStep = document.getElementById('race-select-step');
  const appearanceSelectStep = document.getElementById('appearance-select-step');
  const attributesConfirmStep = document.getElementById('attributes-confirm-step');

  // Botões de Navegação entre Etapas
  const btnNextToRace = document.getElementById('btn-next-to-race');
  const btnPrevToRegion = document.getElementById('btn-prev-to-region');
  const btnNextToAppearance = document.getElementById('btn-next-to-appearance');
  const btnPrevToRace = document.getElementById('btn-prev-to-race');
  const btnNextToConfirm = document.getElementById('btn-next-to-confirm');
  const btnPrevToAppearance = document.getElementById('btn-prev-to-appearance');
  const btnConfirmCreation = document.getElementById('btn-confirm-creation');

  // Dados do Personagem em Criação
  let newCharacter = {
    region: null,
    race: null,
    gender: null,
    name: '',
    attributes: {},
    imageSrc: ''
  };

  // --- FUNÇÕES AUXILIARES ---

  function showScreen(screenElement) {
    document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active-screen'));
    if (screenElement) {
      screenElement.classList.add('active-screen');
    }
  }

  function showCreationStep(stepElement, isNext = true) {
    creationSteps.forEach(s => {
      s.classList.remove('active-step');
      s.classList.remove('reverse-animation');
    });
    if (stepElement) {
      stepElement.classList.add('active-step');
      if (!isNext) {
        stepElement.classList.add('reverse-animation');
      }
    }
    updateStepIndicator();
  }

  function updateStepIndicator() {
    const currentStep = document.querySelector('.creation-step.active-step');
    if (!currentStep) return;

    let currentStepId = currentStep.id;
    Object.values(stepIndicators).forEach(ind => ind && ind.classList.remove('active', 'completed'));

    let stepOrder = ['region-select-step', 'race-select-step', 'appearance-select-step', 'attributes-confirm-step'];
    let currentIndex = stepOrder.indexOf(currentStepId);

    for (let i = 0; i < stepOrder.length; i++) {
      let indicatorKey = stepOrder[i].split('-')[0]; // region, race, etc.
      const indicator = stepIndicators[indicatorKey];
      if (!indicator) continue;

      if (i < currentIndex) {
        indicator.classList.add('completed');
      } else if (i === currentIndex) {
        indicator.classList.add('active');
      }
    }
  }

  function showLoader(show = true, message = "Forjando seu destino...") {
    if (!gameLoader) return;
    const p = gameLoader.querySelector('p');
    if (p) p.textContent = message;
    gameLoader.style.display = show ? 'flex' : 'none';
  }

  function populateRaceGrid() {
    const raceGrid = document.querySelector('.race-grid');
    if (!raceGrid) return;
    raceGrid.innerHTML = '';
    gameData.races.forEach(race => {
      const card = document.createElement('div');
      card.classList.add('selectable-card');
      card.dataset.raceId = race.id;
      card.innerHTML = `
        <img src="${race.imgBase}" alt="${race.name}">
        <h4>${race.name}</h4>
        <p>${race.description}</p>
      `;
      card.addEventListener('click', () => selectCard(raceGrid, card, 'race', race.id));
      raceGrid.appendChild(card);
    });
  }

  function selectCard(grid, selectedCard, selectionType, value) {
    if (!grid || !selectedCard) return;

    grid.querySelectorAll('.selectable-card, .selectable-char-image')
      .forEach(c => c.classList.remove('selected'));

    selectedCard.classList.add('selected');

    if (selectionType === 'region') {
      newCharacter.region = value;
      const regionObj = gameData.regions.find(r => r.id === value);
      const regionName = regionObj ? regionObj.name : value;
      const summaryRegion = document.getElementById('summary-region');
      if (summaryRegion) summaryRegion.textContent = regionName;
      if (btnNextToRace) btnNextToRace.disabled = false;

    } else if (selectionType === 'race') {
      newCharacter.race = value;
      const raceData = gameData.races.find(r => r.id === value);
      if (raceData) {
        const summaryRace = document.getElementById('summary-race');
        if (summaryRace) summaryRace.textContent = raceData.name;

        newCharacter.attributes = { ...raceData.attributes };

        const appearanceTitle = document.getElementById('appearance-title');
        if (appearanceTitle) appearanceTitle.textContent = `Defina seu Herói (${raceData.name}):`;

        const imgMale = document.getElementById('char-img-male');
        const imgFemale = document.getElementById('char-img-female');
        if (imgMale) {
          imgMale.src = raceData.appearances.male;
          imgMale.alt = `${raceData.name} - Aparência Masculina`;
        }
        if (imgFemale) {
          imgFemale.src = raceData.appearances.female;
          imgFemale.alt = `${raceData.name} - Aparência Feminina`;
        }

        const bonusDesc = document.getElementById('race-bonus-description');
        if (bonusDesc) bonusDesc.textContent = raceData.bonusDesc || "";
      }
      if (btnNextToAppearance) btnNextToAppearance.disabled = false;

    } else if (selectionType === 'gender') {
      newCharacter.gender = value;
      const summaryGender = document.getElementById('summary-gender');
      if (summaryGender) summaryGender.textContent = value === 'male' ? 'Masculino' : 'Feminino';

      const raceData = gameData.races.find(r => r.id === newCharacter.race);
      if (raceData) {
        newCharacter.imageSrc = raceData.appearances[value];
        const summaryImg = document.getElementById('summary-char-img');
        if (summaryImg) summaryImg.src = newCharacter.imageSrc;
      }
      checkAppearanceCompletion();
    }
  }

  function checkAppearanceCompletion() {
    const charNameInput = document.getElementById('char-name');
    if (charNameInput) {
      newCharacter.name = charNameInput.value.trim();
      const summaryName = document.getElementById('summary-name');
      if (summaryName) summaryName.textContent = newCharacter.name || '(Não definido)';
    }

    const ready = !!(newCharacter.gender && newCharacter.name);
    if (btnNextToConfirm) btnNextToConfirm.disabled = !ready;
  }

  function resetCreationForm() {
    newCharacter = {
      region: null,
      race: null,
      gender: null,
      name: '',
      attributes: {},
      imageSrc: ''
    };

    document.querySelectorAll('.selectable-card.selected, .selectable-char-image.selected')
      .forEach(el => el.classList.remove('selected'));

    const charNameInput = document.getElementById('char-name');
    if (charNameInput) charNameInput.value = '';

    if (btnNextToRace) btnNextToRace.disabled = true;
    if (btnNextToAppearance) btnNextToAppearance.disabled = true;
    if (btnNextToConfirm) btnNextToConfirm.disabled = true;

    const attributesList = document.getElementById('attributes-list');
    if (attributesList) attributesList.innerHTML = '';

    const summaryName = document.getElementById('summary-name');
    const summaryRegion = document.getElementById('summary-region');
    const summaryRace = document.getElementById('summary-race');
    const summaryGender = document.getElementById('summary-gender');
    const summaryImg = document.getElementById('summary-char-img');
    const bonusDesc = document.getElementById('race-bonus-description');

    if (summaryName) summaryName.textContent = '';
    if (summaryRegion) summaryRegion.textContent = '';
    if (summaryRace) summaryRace.textContent = '';
    if (summaryGender) summaryGender.textContent = '';
    if (summaryImg) summaryImg.src = "https://via.placeholder.com/180x250/34495e/ffffff?text=Herói";
    if (bonusDesc) bonusDesc.textContent = '';

    updateStepIndicator();
  }

  function hydrateContinueButton() {
    if (!btnContinueHero) return;
    const hero = getStoredHero();
    if (!hero) {
      btnContinueHero.disabled = true;
      btnContinueHero.innerHTML = 'Continuar Aventura <small>(Nenhum herói encontrado)</small>';
      return;
    }
    btnContinueHero.disabled = false;
    btnContinueHero.innerHTML = `Continuar como ${hero.name} <small>(${hero.race} de ${hero.region})</small>`;
  }

  // --- EVENTOS ---

  if (btnCreateNewChar) {
    btnCreateNewChar.addEventListener('click', () => {
      showScreen(charCreationScreen);
      resetCreationForm();
      showCreationStep(regionSelectStep);
    });
  }

  if (btnBackToWelcome) {
    btnBackToWelcome.addEventListener('click', () => {
      showScreen(welcomeScreen);
      hydrateContinueButton();
    });
  }

  if (btnBackToWelcomeFromSelect) {
    btnBackToWelcomeFromSelect.addEventListener('click', () => {
      showScreen(welcomeScreen);
      hydrateContinueButton();
    });
  }

  // Seleção de região (cards fixos no HTML)
  document.querySelectorAll('.region-grid .selectable-card').forEach(card => {
    card.addEventListener('click', () => {
      const regionId = card.dataset.region;
      selectCard(document.querySelector('.region-grid'), card, 'region', regionId);
    });
  });

  // Navegação entre etapas
  if (btnNextToRace) {
    btnNextToRace.addEventListener('click', () => {
      if (newCharacter.region) {
        populateRaceGrid();
        showCreationStep(raceSelectStep);
      }
    });
  }

  if (btnPrevToRegion) {
    btnPrevToRegion.addEventListener('click', () => showCreationStep(regionSelectStep, false));
  }

  if (btnNextToAppearance) {
    btnNextToAppearance.addEventListener('click', () => {
      if (newCharacter.race) {
        document.querySelectorAll('#appearance-select-step .selectable-char-image')
          .forEach(c => c.classList.remove('selected'));

        const charNameInput = document.getElementById('char-name');
        if (charNameInput) charNameInput.value = '';

        newCharacter.gender = null;
        newCharacter.name = '';
        newCharacter.imageSrc = 'https://via.placeholder.com/180x250/34495e/ffffff?text=Herói';

        const summaryImg = document.getElementById('summary-char-img');
        if (summaryImg) summaryImg.src = newCharacter.imageSrc;

        checkAppearanceCompletion();
        showCreationStep(appearanceSelectStep);
      }
    });
  }

  if (btnPrevToRace) {
    btnPrevToRace.addEventListener('click', () => showCreationStep(raceSelectStep, false));
  }

  // Seleção de gênero/aparência
  document.querySelectorAll('#appearance-select-step .selectable-char-image').forEach(card => {
    card.addEventListener('click', () => {
      const gender = card.dataset.gender;
      selectCard(document.querySelector('#appearance-select-step .gender-options'), card, 'gender', gender);
    });
  });

  const charNameInput = document.getElementById('char-name');
  if (charNameInput) {
    charNameInput.addEventListener('input', checkAppearanceCompletion);
  }

  if (btnNextToConfirm) {
    btnNextToConfirm.addEventListener('click', () => {
      if (newCharacter.gender && newCharacter.name) {
        const attributesList = document.getElementById('attributes-list');
        if (attributesList) {
          attributesList.innerHTML = '';
          for (const [attr, value] of Object.entries(newCharacter.attributes)) {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${attr.toUpperCase()}:</strong> ${value}`;
            attributesList.appendChild(li);
          }
        }
        showCreationStep(attributesConfirmStep);
      }
    });
  }

  if (btnPrevToAppearance) {
    btnPrevToAppearance.addEventListener('click', () => showCreationStep(appearanceSelectStep, false));
  }

  if (btnConfirmCreation) {
    btnConfirmCreation.addEventListener('click', () => {
      showLoader(true, "Registrando sua lenda em Aethelgard...");

      const hero = buildHeroFromNewCharacter(newCharacter);
      saveHero(hero);

      setTimeout(() => {
        showLoader(false);
        window.location.href = "nojogo.html";
      }, 1200);
    });
  }

  if (btnContinueHero) {
    btnContinueHero.addEventListener('click', () => {
      const hero = getStoredHero();
      if (!hero) return;
      showLoader(true, `Chamando ${hero.name} de volta a Aethelgard...`);
      setTimeout(() => {
        window.location.href = "nojogo.html";
      }, 800);
    });
  }

  // Início
  hydrateContinueButton();
  showScreen(welcomeScreen);
});

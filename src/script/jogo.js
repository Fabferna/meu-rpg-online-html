// js/jogo.js
document.addEventListener('DOMContentLoaded', () => {
    // Elementos da UI
    const gameLoader = document.getElementById('game-loader');
    const welcomeScreen = document.getElementById('welcome-screen');
    const charCreationScreen = document.getElementById('char-creation-screen');
    // const charSelectScreen = document.getElementById('char-select-screen'); // Para o futuro

    const btnContinueGame = document.getElementById('btn-continue-game');
    const btnCreateNewChar = document.getElementById('btn-create-new-char');
    const btnBackToWelcome = document.getElementById('btn-back-to-welcome');
    // const btnBackToWelcomeFromSelect = document.getElementById('btn-back-to-welcome-from-select'); // Futuro

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
        gender: null, // ou 'appearanceKey' se for mais que só M/F
        name: '',
        attributes: {},
        imageSrc: ''
    };

    // --- DADOS DO JOGO (Simulados/Exemplos) ---
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
                imgBase: 'src/asstes/aventureiro_de_aethelgard.png', // Imagem base para card de raça
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

    // --- FUNÇÕES AUXILIARES ---
    function showScreen(screenElement) {
        document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active-screen'));
        screenElement.classList.add('active-screen');
    }

    function showCreationStep(stepElement, isNext = true) {
        creationSteps.forEach(s => {
            s.classList.remove('active-step');
            s.classList.remove('reverse-animation'); // Limpa animação reversa
        });
        stepElement.classList.add('active-step');
        if (!isNext && stepElement.previousElementSibling) { // Adiciona animação reversa se voltando
             stepElement.classList.add('reverse-animation');
        }
        updateStepIndicator();
    }
    
    function updateStepIndicator() {
        let currentStepId = document.querySelector('.creation-step.active-step').id;
        Object.values(stepIndicators).forEach(ind => ind.classList.remove('active', 'completed'));

        let stepOrder = ['region-select-step', 'race-select-step', 'appearance-select-step', 'attributes-confirm-step'];
        let currentIndex = stepOrder.indexOf(currentStepId);

        for (let i = 0; i < stepOrder.length; i++) {
            let indicatorKey = stepOrder[i].split('-')[0]; // region, race, etc.
            if (stepIndicators[indicatorKey]) {
                if (i < currentIndex) {
                    stepIndicators[indicatorKey].classList.add('completed');
                } else if (i === currentIndex) {
                    stepIndicators[indicatorKey].classList.add('active');
                }
            }
        }
    }

    function showLoader(show = true, message = "Forjando seu destino...") {
        gameLoader.querySelector('p').textContent = message;
        gameLoader.style.display = show ? 'flex' : 'none';
    }

    function populateRaceGrid() {
        const raceGrid = document.querySelector('.race-grid');
        raceGrid.innerHTML = ''; // Limpa antes de popular
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
        grid.querySelectorAll('.selectable-card, .selectable-char-image').forEach(c => c.classList.remove('selected'));
        selectedCard.classList.add('selected');

        if (selectionType === 'region') {
            newCharacter.region = value;
            document.getElementById('summary-region').textContent = gameData.regions.find(r=>r.id === value)?.name || value;
            btnNextToRace.disabled = false;
        } else if (selectionType === 'race') {
            newCharacter.race = value;
            const raceData = gameData.races.find(r => r.id === value);
            if (raceData) {
                document.getElementById('summary-race').textContent = raceData.name;
                newCharacter.attributes = { ...raceData.attributes }; // Copia atributos
                document.getElementById('appearance-title').textContent = `Defina seu Herói (${raceData.name}):`;
                document.getElementById('char-img-male').src = raceData.appearances.male;
                document.getElementById('char-img-male').alt = `${raceData.name} - Aparência Masculina`;
                document.getElementById('char-img-female').src = raceData.appearances.female;
                document.getElementById('char-img-female').alt = `${raceData.name} - Aparência Feminina`;
                document.getElementById('race-bonus-description').textContent = raceData.bonusDesc || "";
            }
            btnNextToAppearance.disabled = false;
        } else if (selectionType === 'gender') {
            newCharacter.gender = value;
            document.getElementById('summary-gender').textContent = value === 'male' ? 'Masculino' : 'Feminino';
            const raceData = gameData.races.find(r => r.id === newCharacter.race);
            if (raceData) {
                 newCharacter.imageSrc = raceData.appearances[value];
                 document.getElementById('summary-char-img').src = newCharacter.imageSrc;
            }
            checkAppearanceCompletion();
        }
    }

    function checkAppearanceCompletion() {
        const charNameInput = document.getElementById('char-name');
        newCharacter.name = charNameInput.value.trim();
        document.getElementById('summary-name').textContent = newCharacter.name || '(Não definido)';

        if (newCharacter.gender && newCharacter.name) {
            btnNextToConfirm.disabled = false;
        } else {
            btnNextToConfirm.disabled = true;
        }
    }
    
    // --- INICIALIZAÇÃO E EVENTOS ---
    // Botões da Tela de Boas-Vindas
    btnCreateNewChar.addEventListener('click', () => {
        showScreen(charCreationScreen);
        showCreationStep(regionSelectStep);
        resetCreationForm();
    });

    btnBackToWelcome.addEventListener('click', () => {
        showScreen(welcomeScreen);
    });
    
    // Eventos para seleção de cards de região (adicionados dinamicamente na primeira vez)
    document.querySelectorAll('.region-grid .selectable-card').forEach(card => {
        card.addEventListener('click', () => selectCard(document.querySelector('.region-grid'), card, 'region', card.dataset.region));
    });


    // Navegação entre Etapas de Criação
    btnNextToRace.addEventListener('click', () => {
        if (newCharacter.region) {
            populateRaceGrid(); // Popula as raças aqui
            showCreationStep(raceSelectStep);
        }
    });
    btnPrevToRegion.addEventListener('click', () => showCreationStep(regionSelectStep, false));

    btnNextToAppearance.addEventListener('click', () => {
        if (newCharacter.race) {
            // Limpa seleções anteriores de gênero e nome
            document.querySelectorAll('#appearance-select-step .selectable-char-image').forEach(c => c.classList.remove('selected'));
            document.getElementById('char-name').value = '';
            newCharacter.gender = null;
            newCharacter.name = '';
            newCharacter.imageSrc = 'https://via.placeholder.com/180x250/34495e/ffffff?text=Herói'; // Reset imagem sumário
            document.getElementById('summary-char-img').src = newCharacter.imageSrc;

            checkAppearanceCompletion(); // Para desabilitar o botão next
            showCreationStep(appearanceSelectStep);
        }
    });
    btnPrevToRace.addEventListener('click', () => showCreationStep(raceSelectStep, false));

    // Eventos para seleção de gênero/aparência
    document.querySelectorAll('#appearance-select-step .selectable-char-image').forEach(card => {
        card.addEventListener('click', () => selectCard(document.querySelector('#appearance-select-step .gender-options'), card, 'gender', card.dataset.gender));
    });
    document.getElementById('char-name').addEventListener('input', checkAppearanceCompletion);


    btnNextToConfirm.addEventListener('click', () => {
        if (newCharacter.gender && newCharacter.name) {
            // Popula a lista de atributos no sumário
            const attributesList = document.getElementById('attributes-list');
            attributesList.innerHTML = ''; // Limpa
            for (const [attr, value] of Object.entries(newCharacter.attributes)) {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${attr.toUpperCase()}:</strong> ${value}`;
                attributesList.appendChild(li);
            }
            showCreationStep(attributesConfirmStep);
        }
    });
    btnPrevToAppearance.addEventListener('click', () => showCreationStep(appearanceSelectStep, false));

    btnConfirmCreation.addEventListener('click', () => {
        showLoader(true, "Registrando sua lenda em Aethelgard...");
        console.log("Novo Personagem Criado (Simulado):", newCharacter);
        // Aqui você faria a chamada API para o back-end para salvar o personagem.
        // Por agora, vamos simular e voltar para a tela de boas-vindas.
        setTimeout(() => {
            showLoader(false);
            alert(`Herói ${newCharacter.name} criado com sucesso em ${newCharacter.region} como ${newCharacter.race}! Sua jornada começa agora! (Simulado)`);
            // Atualiza o botão de continuar jogo (simulação)
            btnContinueGame.textContent = `Continuar como ${newCharacter.name}`;
            btnContinueGame.disabled = false;
            btnContinueGame.innerHTML = `Continuar como ${newCharacter.name} <small>(${newCharacter.race} de ${newCharacter.region})</small>`;

            showScreen(welcomeScreen);
            // Idealmente, aqui você iria para uma tela de "jogo iniciado" ou seleção de personagem.
        }, 2500); // Simula tempo de "criação"
    });

    function resetCreationForm() {
        newCharacter = { region: null, race: null, gender: null, name: '', attributes: {}, imageSrc: '' };
        // Reseta seleções visuais e desabilita botões 'próximo'
        document.querySelectorAll('.selectable-card.selected, .selectable-char-image.selected').forEach(el => el.classList.remove('selected'));
        document.getElementById('char-name').value = '';
        btnNextToRace.disabled = true;
        btnNextToAppearance.disabled = true;
        btnNextToConfirm.disabled = true;
        // Reseta os textos do sumário (se necessário, mas são preenchidos dinamicamente)
        // Poderia também resetar os indicadores de passo aqui se quisesse
        updateStepIndicator(); // Para resetar para o primeiro passo
    }


    // Simulação do botão Continuar (seria mais complexo com dados reais)
    btnContinueGame.addEventListener('click', () => {
        if (!btnContinueGame.disabled) {
            // Aqui você carregaria os dados do personagem e iria para a tela do jogo
            showLoader(true, `Carregando aventura de ${newCharacter.name}...`);
            setTimeout(() => {
                showLoader(false);
                alert(`Bem-vindo de volta, ${newCharacter.name}! (Simulado - Entrando no jogo...)`);
                // showScreen(gameplayScreen); // Uma futura tela de gameplay
            }, 1500);
        }
    });

    // Início: Mostrar tela de boas-vindas
    showScreen(welcomeScreen);
    // populateRegionGrid(); // Se fosse dinâmico desde o início
});
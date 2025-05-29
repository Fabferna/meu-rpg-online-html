// js/no_jogo_interface.js
document.addEventListener('DOMContentLoaded', () => {
    // Simulação de dados do jogador (você substituiria isso por dados reais)
    const playerData = {
        name: "AventureiroX", // Viria do char creation / login
        gold: 1250,
        hp_current: 75,
        hp_max: 120,
        mana_current: 40,
        mana_max: 80,
        energy_current: 95,
        energy_max: 100,
        portraitSrc: "https://via.placeholder.com/70x70/e67e22/ffffff?text=AX" // Viria do char creation
    };

    // Atualiza os elementos da UI com os dados do jogador (simulação)
    const playerNameEl = document.getElementById('player-char-name');
    const playerGoldEl = document.getElementById('player-gold');
    const playerPortraitEl = document.getElementById('player-char-img');
    
    const hpBar = document.getElementById('hp-bar');
    const hpValue = document.getElementById('hp-value');
    const manaBar = document.getElementById('mana-bar');
    const manaValue = document.getElementById('mana-value');
    const energyBar = document.getElementById('energy-bar');
    const energyValue = document.getElementById('energy-value');
    const placeholderPlayerName = document.getElementById('placeholder-player-name');


    if (playerNameEl) playerNameEl.textContent = playerData.name;
    if (playerGoldEl) playerGoldEl.textContent = `Ouro: ${playerData.gold}`;
    if (playerPortraitEl) playerPortraitEl.src = playerData.portraitSrc;
    if (placeholderPlayerName) placeholderPlayerName.textContent = playerData.name;

    if (hpBar && hpValue) {
        hpBar.style.width = `${(playerData.hp_current / playerData.hp_max) * 100}%`;
        hpValue.textContent = `${playerData.hp_current}/${playerData.hp_max}`;
    }
    if (manaBar && manaValue) {
        manaBar.style.width = `${(playerData.mana_current / playerData.mana_max) * 100}%`;
        manaValue.textContent = `${playerData.mana_current}/${playerData.mana_max}`;
    }
    if (energyBar && energyValue) {
        energyBar.style.width = `${(playerData.energy_current / playerData.energy_max) * 100}%`;
        energyValue.textContent = `${playerData.energy_current}/${playerData.energy_max}`;
    }


    // Lógica do Menu Dropdown "Aventuras"
    const submenuItems = document.querySelectorAll('.game-navigation .has-submenu');

    submenuItems.forEach(item => {
        const link = item.querySelector('a'); // O link que aciona o dropdown
        const submenu = item.querySelector('.submenu');

        link.addEventListener('click', (event) => {
            // Previne o comportamento padrão do link se for apenas para abrir/fechar
            if (link.getAttribute('href') === '#') {
                event.preventDefault();
            }
            
            // Fecha outros submenus abertos
            submenuItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('open')) {
                    otherItem.classList.remove('open');
                    otherItem.querySelector('a').setAttribute('aria-expanded', 'false');
                }
            });

            // Alterna o submenu atual
            item.classList.toggle('open');
            const isExpanded = item.classList.contains('open');
            link.setAttribute('aria-expanded', isExpanded.toString());
        });
    });

    // Fecha o submenu se clicar fora dele
    document.addEventListener('click', (event) => {
        let clickedInsideSubmenu = false;
        submenuItems.forEach(item => {
            if (item.contains(event.target)) {
                clickedInsideSubmenu = true;
            }
        });

        if (!clickedInsideSubmenu) {
            submenuItems.forEach(item => {
                if (item.classList.contains('open')) {
                    item.classList.remove('open');
                    item.querySelector('a').setAttribute('aria-expanded', 'false');
                }
            });
        }
    });
    
    // Lógica do Menu Hamburguer para Mobile
    const gameNavToggle = document.querySelector('.game-nav-toggle');
    const gameMainMenu = document.getElementById('game-main-menu-list');

    if (gameNavToggle && gameMainMenu) {
        gameNavToggle.addEventListener('click', () => {
            const isExpanded = gameNavToggle.getAttribute('aria-expanded') === 'true' || false;
            gameNavToggle.setAttribute('aria-expanded', !isExpanded);
            gameMainMenu.classList.toggle('open');
            
            // Alterna ícone do botão hamburguer (opcional)
            const icon = gameNavToggle.querySelector('i');
            if (gameMainMenu.classList.contains('open')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }

});
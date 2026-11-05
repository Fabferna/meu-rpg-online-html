// js/home.js
document.addEventListener('DOMContentLoaded', () => {
    const modalOverlay = document.getElementById('info-modal-overlay');
    const modal = document.getElementById('info-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalTitleEl = document.getElementById('modal-title-content');
    const modalDetailsEl = document.getElementById('modal-details-content');
    const modalImageEl = document.getElementById('modal-image');

    let previouslyFocusedElement; // Para retornar o foco ao fechar o modal

    // Dados para os modais (conteúdo detalhado)
    const modalData = {
        'kaelen-details': {
            title: "Herói Revelado: Kaelen, Guardião da Chama Escondida!",
            imgSrc: document.getElementById('img-kaelen-news') ? document.getElementById('img-kaelen-news').src : 'https://via.placeholder.com/400x250/c89b3c/1a120b?text=Kaelen+Detalhe', // Reutiliza imagem da notícia ou usa nova
            imgAlt: 'Kaelen, o Guardião da Chama Escondida',
            htmlContent: `
                <p>Das cinzas de uma antiga ordem, Kaelen surge! Este valente guerreiro, mestre da lâmina e portador de uma centelha da Chama Primordial, jurou proteger os inocentes de Aethelgard. Sua coragem é tão ardente quanto o fogo que ele comanda.</p>
                <h4>Habilidades Notáveis:</h4>
                <ul>
                    <li><strong>Golpe Solar Incandescente:</strong> Um ataque poderoso que cega os inimigos com luz pura e causa dano sagrado. Afeta especialmente criaturas das trevas.</li>
                    <li><strong>Barreira de Cinzas Protetora:</strong> Kaelen pode invocar um escudo de cinzas mágicas que absorve uma quantidade significativa de dano mágico sombrio e concede resistência temporária a maldições.</li>
                    <li><strong>Lâmina Consagrada:</strong> Seus ataques com a espada são imbuídos com poder sagrado, que queima os inimigos e impede a regeneração de feridas em criaturas profanas.</li>
                </ul>
                <p><em>Nascido nas Montanhas Crespúsculo, Kaelen testemunhou a destruição de sua ordem por uma força sombria desconhecida. Agora, ele viaja por Aethelgard em busca de respostas e aliados, carregando o último fragmento da Chama da Esperança. Sua determinação é inabalável, mas um fardo pesado repousa sobre seus ombros.</em></p>
            `
        },
        'sylvandell-details': {
            title: "Nova Região Descoberta: As Ruínas Sussurrantes de Sylvandell!",
            imgSrc: document.getElementById('img-sylvandell-news') ? document.getElementById('img-sylvandell-news').src : 'https://via.placeholder.com/400x250/27ae60/ecf0f1?text=Sylvandell+Detalhe',
            imgAlt: 'As Ruínas Sussurrantes de Sylvandell em detalhe',
            htmlContent: `
                <p>Exploradores intrépidos mapearam uma nova área ao leste das Montanhas Guardiãs: As Ruínas Sussurrantes de Sylvandell. Esta antiga floresta élfica, agora em ruínas e envolta em uma névoa etérea, é repleta de árvores ancestrais cujas folhas brilham com uma luz suave, flora luminescente que ilumina caminhos ocultos e segredos há muito perdidos entre pedras cobertas de musgo.</p>
                <h4>Pontos de Interesse:</h4>
                <ul>
                    <li><strong>O Templo da Lua Silenciosa:</strong> Uma estrutura semi-destruída onde, dizem, os ecos de canções élficas ainda podem ser ouvidos em noites de lua cheia.</li>
                    <li><strong>A Clareira dos Cogumelos Astrais:</strong> Um local onde cogumelos gigantes pulsam com luz própria, atraindo criaturas raras e possuindo propriedades alquímicas únicas.</li>
                    <li><strong>O Labirinto de Raízes Antigas:</strong> Uma rede subterrânea de raízes massivas que forma um labirinto natural, guardado por espíritos da floresta e armadilhas esquecidas.</li>
                </ul>
                <p><em>Sylvandell foi outrora o coração da civilização élfica em Aethelgard, mas um cataclisma misterioso a deixou em ruínas há séculos. Aventureiros que ousam explorar seus recessos podem encontrar tanto tesouros inestimáveis quanto perigos ancestrais que ainda espreitam entre as sombras das árvores colossais.</em></p>
            `
        },
        'vorlag-details': {
            title: "A Sombra se Ergue: Lord Vorlag, o Mestre das Sombras!",
            imgSrc: document.getElementById('img-vorlag-news') ? document.getElementById('img-vorlag-news').src : 'https://via.placeholder.com/400x250/8e44ad/f1c40f?text=Vorlag+Detalhe',
            imgAlt: 'Lord Vorlag, o Mestre das Sombras',
            htmlContent: `
                <p>Uma ameaça ancestral desperta das profundezas mais escuras de Aethelgard! Lord Vorlag, um poderoso feiticeiro caído que outrora buscou o poder dos Deuses Sombrios, foi avistado emergindo de sua fortaleza nas Terras Agourentas. Comanda legiões de criaturas das sombras, mortos-vivos e cultistas fanáticos.</p>
                <h4>Poderes Conhecidos:</h4>
                <ul>
                    <li><strong>Toque Necrótico Congelante:</strong> Sua magia não apenas drena a vida, mas também gela a alma, deixando suas vítimas enfraquecidas e aterrorizadas.</li>
                    <li><strong>Conjuração de Abominações:</strong> Vorlag pode rasgar o véu da realidade para invocar horrores de outros planos para lutar ao seu lado.</li>
                    <li><strong>Aura de Desespero:</strong> Sua mera presença espalha uma onda de medo e desesperança, minando a moral de seus inimigos.</li>
                    <li><strong>Imortalidade Profana:</strong> Rumores indicam que Vorlag encontrou uma forma de atrelar sua alma a um artefato sombrio, tornando-o incrivelmente difícil de ser verdadeiramente destruído.</li>
                </ul>
                <p><em>O objetivo de Vorlag é claro: extinguir a luz e a esperança, mergulhando Aethelgard em um véu de escuridão e sofrimento eternos, transformando o continente em seu próprio império necrótico. Heróis de todas as nações devem se preparar, pois a maior das sombras se ergue para desafiar a existência.</em></p>
            `
        }
    };

    const readMoreLinks = document.querySelectorAll('.read-more');

    function openModal(modalId) {
        const data = modalData[modalId];
        if (!data) {
            console.error('Dados do modal não encontrados para:', modalId);
            return;
        }

        previouslyFocusedElement = document.activeElement; // Salva o foco atual

        modalTitleEl.textContent = data.title;
        modalDetailsEl.innerHTML = data.htmlContent;

        if (data.imgSrc) {
            modalImageEl.src = data.imgSrc;
            modalImageEl.alt = data.imgAlt;
            modalImageEl.style.display = 'block';
        } else {
            modalImageEl.style.display = 'none';
        }

        modalOverlay.style.display = 'block';
        modal.style.display = 'block';
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open'); // Para impedir scroll do fundo

        modalCloseBtn.focus(); // Foco no botão de fechar

        // Adiciona listener para tecla ESC
        document.addEventListener('keydown', handleEscKey);
    }

    function closeModal() {
        modal.style.display = 'none';
        modalOverlay.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');

        if (previouslyFocusedElement) {
            previouslyFocusedElement.focus(); // Retorna o foco
        }
        
        // Remove listener da tecla ESC
        document.removeEventListener('keydown', handleEscKey);
    }

    function handleEscKey(event) {
        if (event.key === 'Escape') {
            closeModal();
        }
    }

    readMoreLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const modalId = link.dataset.modalId;
            openModal(modalId);
        });
    });

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeModal);
    }
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeModal); // Fecha ao clicar no overlay
    }

    // Para o ano no footer (se não estiver usando o shared.js)
    const currentYearFooter = document.getElementById('current-year-footer');
    if (currentYearFooter && !document.getElementById('current-year')) { // Evita duplicar se shared.js já tiver um current-year
        currentYearFooter.textContent = new Date().getFullYear();
    }
});

// Se você criou o js/header_footer_shared.js, mova o script do menu mobile e o do ano para lá.
// Exemplo do que iria para js/header_footer_shared.js:
/*
document.addEventListener('DOMContentLoaded', () => {
    // Script básico para toggle do menu mobile
    const menuToggle = document.querySelector('.menu-toggle');
    const menuList = document.querySelector('#menu-list');

    if (menuToggle && menuList) {
        menuToggle.addEventListener('click', () => {
            const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true' || false;
            menuToggle.setAttribute('aria-expanded', !isExpanded);
            menuList.classList.toggle('active');
            const icon = menuToggle.querySelector('i') || menuToggle; // Para o caso de ter um ícone ou só texto
            icon.innerHTML = !isExpanded ? '&times;' : '☰'; 
        });
    }

    // Atualiza o ano no rodapé (geralmente um span com id="current-year")
    const currentYearSpan = document.getElementById('current-year') || document.getElementById('current-year-footer');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
});
*/
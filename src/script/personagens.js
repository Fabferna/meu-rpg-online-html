// src/js/personagens.js
document.addEventListener('DOMContentLoaded', () => {
    const modalOverlay = document.getElementById('info-modal-overlay');
    const modal = document.getElementById('info-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalCharacterHeroImageEl = document.getElementById('modal-character-hero-image');
    const modalTitleEl = document.getElementById('modal-title-content');
    const modalCharacterEpithetEl = document.getElementById('modal-character-epithet');
    const modalDetailsEl = document.getElementById('modal-details-content');

    let previouslyFocusedElement; 

    const characterModalData = {
        'kaelen-profile': {
            name: "Kaelen",
            epithet: "O Guardião da Chama Escondida",
            imgSrcId: 'img-kaelen-card', // ID da imagem no card HTML
            imgAlt: 'Kaelen, o Guardião da Chama Escondida',
            htmlContent: `
                <h4>Biografia:</h4>
                <p>Das cinzas de uma antiga ordem monástica que protegia um farol nas Montanhas Crespúsculo, Kaelen surge como o último portador da Chama da Esperança. Este valente guerreiro, mestre da lâmina longa e treinado nas artes do combate e da fé, jurou proteger os inocentes de Aethelgard contra as sombras crescentes. Sua coragem é tão ardente quanto o fogo que ele comanda, mas a responsabilidade de sua herança e a perda de seus irmãos de ordem pesam em seu coração.</p>
                <h4>Habilidades Notáveis:</h4>
                <ul>
                    <li><strong>Golpe Solar Incandescente:</strong> Canalizando a Chama da Esperança, Kaelen desfere um golpe que cega inimigos próximos com luz pura e causa dano sagrado massivo, especialmente eficaz contra criaturas da escuridão.</li>
                    <li><strong>Barreira de Cinzas Protetora:</strong> Kaelen invoca um escudo rodopiante de cinzas sagradas e brasas, que absorve uma quantidade significativa de dano mágico, especialmente de natureza sombria ou necrótica, e concede resistência temporária a maldições.</li>
                    <li><strong>Lâmina Consagrada:</strong> Sua arma é permanentemente imbuída com poder sagrado. Ataques com esta lâmina queimam os inimigos com fogo purificador, impedem a regeneração de feridas em criaturas profanas e podem quebrar encantamentos malignos.</li>
                </ul>
                <p><em>"Enquanto a Chama arder em meu peito, a esperança não se extinguirá em Aethelgard."</em></p>
            `
        },
        'vorlag-profile': {
            name: "Lord Vorlag",
            epithet: "O Mestre das Sombras Corrompidas",
            imgSrcId: 'img-vorlag-card',
            imgAlt: 'Lord Vorlag, Mestre das Sombras',
            htmlContent: `
                <h4>Origens Sombrias:</h4>
                <p>Outrora um renomado arquimago do Conselho de Aethelgard, Vorlag foi consumido pela ambição e pela busca de poder proibido. Mergulhando em tomos necróticos e pactos com entidades abissais, ele sacrificou sua humanidade em troca de uma imortalidade macabra e o comando sobre as legiões da noite. Sua fortaleza, o Pináculo Agourento, ergue-se nas terras desoladas como um testamento de sua corrupção.</p>
                <h4>Poderes Temíveis:</h4>
                <ul>
                    <li><strong>Toque Necrótico Congelante:</strong> Sua magia não apenas drena a essência vital, mas também instila um frio sepulcral que paralisa a alma e espalha decadência.</li>
                    <li><strong>Conjuração de Abominações Sombrias:</strong> Vorlag pode rasgar o véu entre os mundos para invocar horrores espectrais, golens de ossos e outras monstruosidades para servi-lo em batalha.</li>
                    <li><strong>Aura de Desespero Profundo:</strong> Uma emanação constante de medo e desesperança o envolve, minando a coragem e a vontade de lutar de seus inimigos, tornando-os presas fáceis para suas maquinações.</li>
                    <li><strong>Pacto de Imortalidade (Rumor):</strong> Diz-se que Vorlag atrelou sua alma a um artefato ancestral, o Coração das Sombras, tornando-o imune à morte convencional enquanto o artefato permanecer intacto.</li>
                </ul>
                <p><em>"A luz é uma ilusão fugaz. Apenas na escuridão eterna reside o verdadeiro poder e a ordem."</em></p>
            `
        },
        'lyra-profile': {
            name: "Lyra",
            epithet: "A Sacerdotisa da Lua Argêntea",
            imgSrcId: 'img-lyra-card',
            imgAlt: 'Sacerdotisa Lyra da Lua Argêntea',
            htmlContent: `
                <h4>Guardiã da Luz Lunar:</h4>
                <p>Lyra é uma das poucas sacerdotisas remanescentes dos Templos Lunares de Sylvandell, um refúgio de sabedoria e magia curativa escondido nas profundezas da floresta ancestral. Desde jovem, demonstrou uma afinidade única com os ciclos da lua e as energias restauradoras que emanam do firmamento noturno. Sua serenidade e compaixão são um bálsamo para os aflitos, mas sua determinação em proteger os segredos de seu povo é feita de aço élfico.</p>
                <h4>Dons da Lua:</h4>
                <ul>
                    <li><strong>Bênção Lunar Restauradora:</strong> Canalizando a luz prateada da lua, Lyra pode curar ferimentos graves, purificar venenos e remover aflições mágicas de seus aliados.</li>
                    <li><strong>Flecha de Prata Purificadora:</strong> Imbuindo suas flechas com energia lunar sagrada, Lyra pode banir espíritos malignos, causar dano severo a mortos-vivos e quebrar ilusões sombrias.</li>
                    <li><strong>Visão da Penumbra Arcana:</strong> Seus olhos, acostumados à luz sutil da lua, podem ver através da escuridão mágica, detectar auras invisíveis e prever os movimentos imediatos de seus inimigos em combate.</li>
                    <li><strong>Manto Protetor da Constelação:</strong> Em momentos de grande necessidade, Lyra pode invocar o poder das constelações para criar uma barreira protetora ao redor dela e de seus companheiros.</li>
                </ul>
                <p><em>"Na mais escura das noites, a lua ainda nos guia com sua luz gentil. Que ela ilumine nosso caminho."</em></p>
            `
        },
        'roric-profile': {
            name: "Roric \"Corvo\" Blackwood",
            epithet: "O Mercenário Astuto",
            imgSrcId: 'img-roric-card',
            imgAlt: 'Roric "Corvo" Blackwood, o Mercenário',
            htmlContent: `
                <h4>Sombras e Segredos:</h4>
                <p>Pouco se sabe sobre o passado de Roric, apelidado de "Corvo" tanto por sua preferência por trajes escuros quanto por sua tendência a aparecer e desaparecer como um mau presságio para seus alvos. Ele opera nas vielas sombrias das cidades portuárias e nas estradas menos percorridas, oferecendo seus serviços de espionagem, sabotagem e, ocasionalmente, eliminação, para quem puder pagar seu alto preço. Sua moralidade é flexível, mas dizem que ele possui um código de honra peculiar: nunca trai um contrato pago.</p>
                <h4>Ferramentas do Ofício:</h4>
                <ul>
                    <li><strong>Ataque Furtivo Mortal:</strong> Mestre em se aproximar sem ser detectado, Roric pode desferir um golpe devastador em um ponto vital antes que o inimigo perceba sua presença.</li>
                    <li><strong>Manto das Sombras Evanescente:</strong> Usando uma combinação de técnicas de distração e pós mágicos, Roric pode se tornar praticamente invisível por um curto período, ideal para escapar de situações perigosas ou se reposicionar.</li>
                    <li><strong>Adagas Envenenadas (Peçonha Sutil):</strong> Suas lâminas são frequentemente untadas com uma variedade de venenos que podem paralisar, enfraquecer ou causar dor excruciante, dependendo da necessidade do "trabalho".</li>
                    <li><strong>Rede de Informantes:</strong> O Corvo mantém uma vasta rede de contatos nos submundo, permitindo-lhe obter informações valiosas sobre alvos, rotas seguras e tesouros escondidos.</li>
                </ul>
                <p><em>"Todo mundo tem um preço. O meu é apenas um pouco mais... exclusivo."</em></p>
            `
        }
    };

    const characterDetailLinks = document.querySelectorAll('.btn-character-details');

    function openCharacterModal(modalId) {
        const data = characterModalData[modalId];
        if (!data) {
            console.error('Dados do modal de personagem não encontrados para:', modalId);
            return;
        }

        previouslyFocusedElement = document.activeElement; 

        modalTitleEl.textContent = data.name;
        modalCharacterEpithetEl.textContent = data.epithet;
        modalDetailsEl.innerHTML = data.htmlContent;

        const cardImageElement = document.getElementById(data.imgSrcId);
        if (cardImageElement && cardImageElement.src) {
            modalCharacterHeroImageEl.src = cardImageElement.src;
            modalCharacterHeroImageEl.alt = data.imgAlt;
            modalCharacterHeroImageEl.style.display = 'block';
        } else {
            modalCharacterHeroImageEl.style.display = 'none';
            console.warn("Imagem do card não encontrada para o modal:", modalId, "- ID esperado:", data.imgSrcId);
        }

        modalOverlay.style.display = 'block';
        modal.style.display = 'block';
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open'); 

        modalCloseBtn.focus(); 
        document.addEventListener('keydown', handleEscKey);
    }

    function closeCharacterModal() {
        modal.style.display = 'none';
        modalOverlay.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');

        if (previouslyFocusedElement) {
            previouslyFocusedElement.focus(); 
        }
        
        document.removeEventListener('keydown', handleEscKey);
    }

    function handleEscKey(event) {
        if (event.key === 'Escape') {
            closeCharacterModal();
        }
    }

    if (characterDetailLinks.length > 0 && modal && modalOverlay && modalCloseBtn) {
        characterDetailLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const modalId = link.dataset.modalId;
                if (modalId) {
                    openCharacterModal(modalId);
                } else {
                    console.error("Link 'Ver Detalhes' não possui data-modal-id:", link);
                }
            });
        });

        modalCloseBtn.addEventListener('click', closeCharacterModal);
        modalOverlay.addEventListener('click', closeCharacterModal); 
    } else {
        if (!modal) console.error("Elemento #info-modal não encontrado.");
        if (!modalOverlay) console.error("Elemento #info-modal-overlay não encontrado.");
        if (!modalCloseBtn) console.error("Elemento #modal-close-btn não encontrado.");
        if (characterDetailLinks.length === 0) console.warn("Nenhum link .btn-character-details encontrado. Se esta página não tiver esses links, este aviso pode ser ignorado.");
    }
});
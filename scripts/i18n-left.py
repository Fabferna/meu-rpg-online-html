"""Mostra linhas que ainda têm texto em português fora de t("...")."""
import re, sys
PT = re.compile(r"[ãõçáéíóúâêôÁÉÍÓÚÂÊÔÃÕÇ]|\b(de|da|do|para|com|sem|seu|sua|você|não|mais|por|em|dia|dias|nível|ouro|missão|herói|Nv|Requer|Volte|Esgotado|Remover|Equipar|Vender|Entrar|Sair|Usar|Resgatar|Comprar|Carregando|Termina|Restam|Feito|Ataque|Atacar|Fugir|Defender|Poção|Vida|Energia|Próximo|Voltar|Pular|Guardar|Treinar|Desafiar|Membro|Líder|Oficial|Doar|Fundar|Rebaixar|Promover|Expulsar|Recarga|Habilidade|Turno|Estágio|Masmorra|Chefe|Caçada|Arena|Loja|Inventário|Objetivos|Missões|Mundo|Guilda|Passe|Ranking|Herói|Silenciar|Ocultar|Denunciar|Enviar|Copiar|Instalar|Dobro|semana|hoje|amanhã)\b")
for f in sys.argv[1:]:
    for n, line in enumerate(open(f), 1):
        st = line.strip()
        if st.startswith(("import ", "//", "*", "/*", "{/*")): continue
        x = re.sub(r't\("(?:[^"\\]|\\.)*"', "", line)
        x = re.sub(r'className=("[^"]*"|\{`[^`]*`\})', "", x)
        x = re.sub(r'(href|src|key|id|data-[\w-]+|alt)=("[^"]*"|\{[^}]*\})', "", x)
        x = re.sub(r"//.*$", "", x)
        if PT.search(x): print(f"{f.split('/')[-1]}:{n}: {st[:150]}")

# ✅ Checklist de Lançamento — Aethelgard Online

Roteiro prático para colocar o jogo no ar **sem gastar nada** e acompanhar os primeiros dias.
Os detalhes de cada configuração estão no [`DEPLOY.md`](DEPLOY.md); aqui está **a ordem e o que testar**.

> ⏱ Tempo total estimado: **2 a 3 horas** (a maior parte é configurar Google/Facebook).

---

## Fase 1 — Banco de dados (Supabase) · ~20 min

- [ ] Criar o projeto no [Supabase](https://supabase.com) (plano Free, região **São Paulo**). Guardar a senha do banco.
- [ ] **SQL Editor → New query** → colar o arquivo **`supabase/todas_as_migracoes.sql`** inteiro → **Run**.
      (É a junção das 13 migrações. Use num projeto **novo**; se der erro, me mande a mensagem.)
- [ ] Rodar **`supabase/verificar.sql`**. Esperado: tudo `true`, exceto:
  - "Pelo menos um administrador" → fica `true` na Fase 4.
  - "Chat em tempo real" → se `false`, vá em **Database → Publications → supabase_realtime** e marque `chat_messages`.
- [ ] **Authentication → URL Configuration**: Site URL `https://meu-rpg-online-html.vercel.app` + Redirect URL `https://meu-rpg-online-html.vercel.app/auth/callback`.
- [ ] Copiar as 3 chaves (**Project Settings → API**): URL, `anon`, `service_role`.

## Fase 2 — Site (Vercel) · ~15 min

- [ ] **Settings → Framework Preset → Next.js**.
- [ ] **Settings → Environment Variables** (Production + Preview):
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (marque **Sensitive**)
  - `NEXT_PUBLIC_SITE_URL` = `https://meu-rpg-online-html.vercel.app`
  - `NEXT_PUBLIC_CONTACT_EMAIL` = seu e-mail de contato (aparece nos Termos)
  - (opcional, recomendado) `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`
  - ❌ **Não** coloque `PAYMENTS_DEV` em produção.
- [ ] Fazer o **merge** do Pull Request #1 no `main`.
- [ ] Aguardar o deploy ficar **Ready** (aba Deployments). Se falhar, copie o log de erro e me mande.
- [ ] Abrir o site: a página inicial e `/demo` devem carregar.

## Fase 3 — Login · ~45 min

- [ ] **E-mail/senha**: criar uma conta, receber o e-mail de confirmação, clicar e entrar.
- [ ] **Google**: configurar no Google Cloud (DEPLOY.md A.2) e testar "Entrar com Google".
- [ ] **Facebook**: configurar no Meta for Developers (DEPLOY.md A.2), usar
      `…/privacidade` e `…/termos` como URLs obrigatórias, colocar o app **Ao vivo** e testar.

## Fase 4 — Você como administrador · ~5 min

- [ ] Criar seu herói no jogo.
- [ ] Rodar no SQL Editor (troque o nome):
  ```sql
  update public.profiles set is_admin = true
  where id = (select user_id from public.characters where name = 'SeuHeroi');
  ```
- [ ] Abrir `/admin` → deve mostrar o painel de estatísticas e moderação.
- [ ] Rodar `verificar.sql` de novo → tudo `true`.

## Fase 5 — Teste completo do jogo · ~30 min

Jogue com seu herói e marque o que funcionou. Qualquer erro: anote a tela e a mensagem.

**Primeiros passos**
- [ ] Tutorial aparece no primeiro acesso e leva às Missões.
- [ ] Janela da **Recompensa Diária** abre e o resgate dá ouro.
- [ ] Botão 🎁 no topo mostra a sequência (🔥1).

**Core loop**
- [ ] Iniciar a missão **Patrulha em Valerion** → cronômetro roda → resgatar após 1 min.
- [ ] **Caçada** contra a Criatura das Sombras: atacar, habilidade, habilidade racial, poção.
- [ ] Vencer → recompensa aparece; perder/fugir → vida diminui e regenera com o tempo.
- [ ] Energia diminui ao jogar e volta 1 ponto a cada 3 min.
- [ ] Subir de nível → janela de comemoração → distribuir pontos de atributo.

**Progressão**
- [ ] Aba **Mundo**: ler e vencer o Capítulo 1 da história.
- [ ] **Objetivos**: uma diária fica pronta e o resgate funciona.
- [ ] **Inventário**: equipar item, vender poção, **Ferreiro** comprar item, **Forja** aprimorar a espada para +1.
- [ ] **Pets**: (quando tiver 2.000 de ouro) comprar e ativar o Lobo.
- [ ] **Masmorras** (nível 3+): entrar na Cripta e passar de estágio.

**Social** (peça a 1 amigo para criar conta pelo seu link de convite)
- [ ] Link de convite (aba Objetivos) → o amigo vê "Você recebeu um convite" e ganha 300 de ouro.
- [ ] **Arena**: desafiar o amigo.
- [ ] **Guilda**: fundar uma guilda (1.000 de ouro), o amigo entra, doar ao cofre, atacar o Chefe da Guilda.
- [ ] **Chat**: mensagem no Global aparece para o amigo em segundos; palavrão vira `****`; link é bloqueado.
- [ ] **Denunciar** uma mensagem (⚑) → aparece no `/admin`.

**Loja**
- [ ] Ver Loja, Passe de Temporada, ofertas com cronômetro.
- [ ] Compra com **ouro** de um cosmético (Moldura de Bronze 800 🪙) e equipar.

**Segurança (rápido)**
- [ ] No navegador, aperte F12 → Console e cole:
      `fetch('/api/character',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Hack',race:'humano',region:'sylvandell',gender:'male',gold:999999})})`
      → deve responder **erro** (campo extra rejeitado) e o ouro não muda.
- [ ] Abrir `/admin` numa janela anônima com outra conta → deve dar **404**.

## Fase 6 — Celular · ~10 min

- [ ] Abrir no celular: menus, combate e chat cabem na tela.
- [ ] **Instalar**: Android/Chrome → botão 📲 Instalar; iPhone → Compartilhar → "Adicionar à Tela de Início".
- [ ] Iniciar uma missão, sair do app e voltar quando terminar (o aviso aparece).
- [ ] Colar o link do jogo no WhatsApp → aparece a prévia com imagem.

## Fase 7 — Pagamentos em modo TESTE (opcional) · ~30 min

Deixa a loja de gemas funcionando com dinheiro de mentira. Ver DEPLOY.md A.5.
- [ ] Stripe em **Test mode**: chaves `sk_test_`/`whsec_` na Vercel; comprar com o cartão `4242 4242 4242 4242`.
- [ ] Mercado Pago com **credenciais de teste** e comprador de teste.
- [ ] As gemas chegam em segundos e a compra aparece no `/admin` (Receita).
- [ ] Reembolsar pelo painel do gateway → gemas são removidas.

> 💡 Sem os gateways configurados, os botões de compra com dinheiro mostram "Pagamentos ainda não configurados". O resto do jogo funciona normalmente.

---

## 🚀 Dia do lançamento

- [ ] Divulgar **o seu link de convite** (aba Objetivos), não só o link do site — você ganha gemas por cada amigo que chegar ao nível 5.
- [ ] Onde divulgar: grupos de WhatsApp/Telegram, Discord de RPG, Reddit (r/brdev, r/jogosbrasil), TikTok/Shorts mostrando uma luta ou a abertura de baú.
- [ ] Ficar online no **chat Global** nas primeiras horas: responda dúvidas e anime a comunidade.
- [ ] Deixar o `/admin` aberto e olhar a cada poucas horas.

## 📊 Primeiros 7 dias — o que acompanhar no `/admin`

| Indicador | Bom sinal | Se estiver ruim, faça… |
|---|---|---|
| **Cadastros por dia** | crescendo ou estável | Divulgue mais; peça para jogadores usarem o link de convite. |
| **Ativos 7d ÷ Jogadores** | acima de 30% | Jogadores somem cedo: ative um evento (XP ×2), ofereça gemas no login diário, adicione um capítulo. |
| **Nível médio** | sobe 1–2 por semana | Se travar: deixe missões mais rápidas ou dê mais XP; se subir rápido demais: o contrário. |
| **Ouro entra ÷ sai** | entra até ~1,5× do que sai | Inflação: crie um item caro no Ferreiro ou um evento de Forja com desconto. |
| **Gemas gastas** | recarga de energia e cosméticos no topo | Ajuste preços: o que ninguém compra, baixe; o que todos compram, crie variações. |
| **Denúncias abertas** | perto de zero | Modere em `/admin`; silencie quem insiste. |
| **Pagantes ÷ Jogadores** (com pagamento real) | 1–5% é normal | Destaque o Pacote do Aventureiro e o bônus de primeira compra. |

## 🧯 Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| Site mostra o HTML antigo | Preset não mudou ou o merge não foi feito | Fase 2: Framework Preset Next.js + merge + Redeploy. |
| Deploy falha na Vercel | Variável faltando ou erro de build | Confira as variáveis; mande o log de erro. |
| "Não foi possível autenticar" no Google/Facebook | URL de retorno errada | Use exatamente `https://SEU-PROJETO.supabase.co/auth/v1/callback` no Google/Facebook. |
| E-mail de confirmação não chega | Limite do SMTP padrão do Supabase | Configure SMTP grátis (Resend) — DEPLOY.md A.2. |
| Login funciona mas `/jogo` volta ao login | `NEXT_PUBLIC_SITE_URL` ou Redirect URL diferentes do domínio | Deixe as duas iguais ao endereço do site. |
| Erro 500 ao criar herói | Migrações não aplicadas | Rode `todas_as_migracoes.sql` e `verificar.sql`. |
| Chat não atualiza na hora | Realtime desligado | Database → Publications → `chat_messages`. |
| Projeto Supabase "pausado" | 7 dias sem acesso no plano Free | Clique em *Restore* no painel. |
| Gemas não chegam após pagar | Webhook ou segredo errado | Confira a URL e o segredo do webhook; veja os logs do webhook no painel do gateway. |

## 💰 Antes de cobrar dinheiro de verdade

- [ ] Trocar chaves de teste por **produção** (Stripe e Mercado Pago) e refazer os webhooks.
- [ ] Fazer **1 compra real** com cartão e **1 com Pix** e conferir as gemas.
- [ ] Migrar para **Vercel Pro** (o plano grátis não permite uso comercial).
- [ ] Considerar **Supabase Pro** (backups diários).
- [ ] Revisar Termos/Privacidade (idealmente com um advogado) e ver com um contador como emitir nota (MEI costuma servir no começo).

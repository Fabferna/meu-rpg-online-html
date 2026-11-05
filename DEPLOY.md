# 🚀 Deploy do Aethelgard Online

> 📋 Para a ordem dos passos e os testes do dia do lançamento, use o [`LANCAMENTO.md`](LANCAMENTO.md).

Guia em duas partes:

- **Parte A — Custo zero (agora):** tudo funcionando em `https://meu-rpg-online-html.vercel.app` com planos gratuitos.
- **Parte B — Produção com domínio pago (depois):** domínio próprio, Cloudflare, planos pagos e checklist de lançamento.

> ⏱ Tempo estimado da Parte A: 1 a 2 horas na primeira vez.

---

## Visão geral

```
 Jogador ──HTTPS──► Vercel (Next.js: páginas + API do jogo)
                        │  service_role (secreta)
                        ▼
                    Supabase (Postgres + Auth)        Stripe / Mercado Pago
                        ▲                                   │ webhooks assinados
                        └──────── /api/webhooks/* ◄─────────┘
```

| Serviço | Para quê | Plano grátis cobre? |
|---|---|---|
| **Vercel** | Hospeda o site e a API | ✅ Hobby (uso **não comercial**, veja B.3) |
| **Supabase** | Banco de dados + login | ✅ Free: 500 MB, 50 mil usuários ativos/mês |
| **Upstash Redis** | Rate limit entre instâncias | ✅ Free: 10 mil comandos/dia |
| **Google / Facebook OAuth** | Login social | ✅ Grátis |
| **Stripe / Mercado Pago** | Pagamentos | ✅ Sem mensalidade, só taxa por venda |
| **Cloudflare** | DDoS/WAF/CDN | ✅ Free — mas exige domínio próprio (Parte B) |

---

# PARTE A — Custo zero

## A.1 Criar o banco (Supabase Free)

1. Acesse <https://supabase.com> → **Start your project** → entre com o GitHub.
2. **New project**:
   - **Name:** `aethelgard-prod`
   - **Database Password:** clique em *Generate* e **guarde num gerenciador de senhas**.
   - **Region:** `South America (São Paulo)` (menor latência para jogadores BR).
   - **Plan:** Free.
3. Aguarde ~2 minutos até o projeto ficar verde.
4. Menu lateral → **SQL Editor** → **New query**. **Jeito mais fácil:** cole o arquivo `supabase/todas_as_migracoes.sql` inteiro e rode (**Run**). Depois rode `supabase/verificar.sql` para conferir. Se preferir, rode as migrações **uma de cada vez e nesta ordem**:
   1. `supabase/migrations/0001_init.sql`
   2. `supabase/migrations/0002_core_loop.sql`
   3. `supabase/migrations/0003_economy.sql`
   4. `supabase/migrations/0004_progression.sql`
   5. `supabase/migrations/0005_webp_images.sql`
   6. `supabase/migrations/0006_weekly_ranking.sql`
   7. `supabase/migrations/0007_daily_login_streak.sql`
   8. `supabase/migrations/0008_referrals.sql`
   9. `supabase/migrations/0009_guilds_chat.sql`
   10. `supabase/migrations/0010_guild_boss_war_moderation.sql`
   11. `supabase/migrations/0011_events_upgrades_stats.sql`
   12. `supabase/migrations/0012_pass_pets_dungeons.sql`
   13. `supabase/migrations/0013_story_regions.sql`

   Cada um deve terminar com `Success. No rows returned`.
5. **Chat em tempo real:** em **Database → Publications → supabase_realtime**, confira se a tabela `chat_messages` está marcada (a migração 0009 já faz isso; sem Realtime o chat continua funcionando, atualizando a cada poucos segundos).
6. Confira em **Table Editor** que existem as tabelas `characters`, `wallets`, `ledger`, `battles`, `payments`…
6. Pegue as chaves em **Project Settings → API** (ou **API Keys**):
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / `publishable` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` / `secret` → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **nunca** cole essa em lugar público.

> ⚠️ **Plano Free pausa o projeto após 7 dias sem acesso.** Se pausar, entre no painel e clique em *Restore*. Com jogadores ativos isso não acontece.

### Tornar-se administrador (moderação do chat)
Depois de criar seu herói no jogo, rode no **SQL Editor** (troque o nome):
```sql
update public.profiles set is_admin = true
where id = (select user_id from public.characters where name = 'SeuHeroi');
```
O painel fica em `/admin` (para os demais jogadores essa página não existe), com estatísticas, denúncias e punições.

### Criar eventos (XP/ouro em dobro)
O "Fim de Semana Heroico" (XP ×2 todo sábado e domingo) já vem ativo. Para um evento com data, rode:
```sql
insert into public.game_events (id, name, description, kind, multiplier, starts_at, ends_at)
values ('natal_ouro', 'Natal Dourado', 'Ouro em dobro!', 'gold', 2, '2026-12-24 00:00+00', '2026-12-26 23:59+00');
```
Para desligar: `update public.game_events set enabled = false where id = 'fim_de_semana_xp';`

## A.2 Configurar o login

### E-mail e senha
1. **Authentication → Providers → Email**: deixe **Enable** e **Confirm email** ligados.
2. **Authentication → URL Configuration**:
   - **Site URL:** `https://meu-rpg-online-html.vercel.app`
   - **Redirect URLs** (adicione as duas):
     - `https://meu-rpg-online-html.vercel.app/auth/callback`
     - `http://localhost:3000/auth/callback`
3. (Opcional) **Authentication → Email Templates**: traduza o e-mail de confirmação para português.

> O SMTP padrão do Supabase envia poucos e-mails por hora (ótimo para testes). Para lançamento, use um SMTP grátis como **Resend** (3 mil e-mails/mês) em **Project Settings → Auth → SMTP**.

### Google
1. <https://console.cloud.google.com> → crie um projeto `Aethelgard`.
2. **APIs e serviços → Tela de permissão OAuth** → *Externo* → preencha nome do app, e-mail de suporte, domínio `vercel.app` não precisa ser verificado para testes → **Publicar app**.
3. **Credenciais → Criar credenciais → ID do cliente OAuth** → tipo **Aplicativo da Web**.
   - **URIs de redirecionamento autorizados:** `https://SEU-PROJETO.supabase.co/auth/v1/callback` (aparece no Supabase em *Providers → Google*).
4. Copie **Client ID** e **Client Secret** → Supabase **Authentication → Providers → Google** → cole → **Save**.

### Facebook
1. <https://developers.facebook.com> → **Meus apps → Criar app** → caso de uso **Autenticar e solicitar dados dos usuários com o Login do Facebook**.
2. **Login do Facebook → Configurações**:
   - **URIs de redirecionamento do OAuth válidos:** `https://SEU-PROJETO.supabase.co/auth/v1/callback`
3. **Configurações do app → Básico**: copie **ID do app** e **Chave secreta**; preencha **URL da Política de Privacidade** com `https://meu-rpg-online-html.vercel.app/privacidade` e **Termos de Serviço** com `.../termos` (as páginas já existem no jogo).
4. Supabase **Providers → Facebook** → cole → **Save**.
5. Para jogadores de fora testarem, mude o app de *Desenvolvimento* para **Ao vivo**.

## A.3 Rate limit grátis (Upstash)

Na Vercel cada requisição pode cair numa instância diferente, então o limitador em memória não basta.

1. <https://upstash.com> → **Create Database** → Redis → Região `sa-east-1` → Free.
2. Aba **REST API**: copie `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.

## A.4 Publicar na Vercel (projeto que você já tem)

O projeto atual `meu-rpg-online-html` foi criado servindo **HTML estático**. Agora ele é **Next.js**, então:

1. **Junte o branch no `main`** (pelo GitHub: abra um Pull Request de `claude/affectionate-heisenberg-2te7fx` → `main` e faça merge). A Vercel publica o `main` automaticamente.
   - Dica: antes do merge, a Vercel já cria um **Preview** para o branch. Abra a aba **Deployments** e procure o deploy do branch — dá para testar a `/demo` sem mexer no site principal.
2. Vercel → seu projeto → **Settings → Build and Deployment (General)**:
   - **Framework Preset:** `Next.js`
   - **Build Command / Output Directory / Install Command:** deixe em branco (padrão).
   - **Root Directory:** `./`
   - **Node.js Version:** `22.x`
3. **Settings → Environment Variables** → adicione (marque *Production* e *Preview*):

   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL do A.1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave anon |
   | `SUPABASE_SERVICE_ROLE_KEY` | chave service_role (marque **Sensitive**) |
   | `NEXT_PUBLIC_SITE_URL` | `https://meu-rpg-online-html.vercel.app` |
   | `UPSTASH_REDIS_REST_URL` | do A.3 |
   | `UPSTASH_REDIS_REST_TOKEN` | do A.3 (Sensitive) |
   | `NEXT_PUBLIC_CONTACT_EMAIL` | seu e-mail de contato (aparece nos Termos e na Privacidade) |

   ❌ **Não** adicione `PAYMENTS_DEV` em produção.
4. **Deployments → ⋯ → Redeploy** para aplicar as variáveis.
5. Teste:
   - `https://meu-rpg-online-html.vercel.app/demo` → telas do jogo.
   - Crie uma conta → confirme o e-mail → crie o herói → faça uma missão.

### HTTPS / SSL
Já vem pronto: todo `*.vercel.app` tem certificado automático e o app envia `Strict-Transport-Security`. Nada a fazer.

### Proteção contra DDoS sem pagar
A Vercel já tem mitigação de DDoS automática em todos os planos. Além disso, ative em **Settings → Security / Firewall**:
- **Attack Challenge Mode**: ligue só se estiver sob ataque.
- **Bot Protection / Bot Filter** (se disponível no Hobby).

Somado ao rate limit por jogador (A.3) e às checagens do servidor, é proteção suficiente para começar.

## A.5 Pagamentos em modo TESTE (grátis)

Dá para deixar a loja **100% funcional com dinheiro de mentira**, sem pagar nada.

### Stripe (teste)
1. Crie conta em <https://dashboard.stripe.com> (não precisa ativar a conta para modo teste). Garanta que está em **Test mode**.
2. **Developers → API keys** → copie a **Secret key** (`sk_test_...`) → Vercel `STRIPE_SECRET_KEY`.
3. **Developers → Webhooks → Add endpoint**:
   - URL: `https://meu-rpg-online-html.vercel.app/api/webhooks/stripe`
   - Eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, `charge.dispute.created`
   - Copie o **Signing secret** (`whsec_...`) → Vercel `STRIPE_WEBHOOK_SECRET`.
4. Compre na loja com o cartão de teste `4242 4242 4242 4242`, validade futura, CVC `123`.

### Mercado Pago (teste)
1. <https://www.mercadopago.com.br/developers> → **Suas integrações → Criar aplicação** (Checkout Pro).
2. **Credenciais de teste** → **Access Token** (`TEST-...`) → Vercel `MERCADOPAGO_ACCESS_TOKEN`.
3. **Webhooks → Configurar notificações**:
   - URL de teste: `https://meu-rpg-online-html.vercel.app/api/webhooks/mercadopago`
   - Evento: **Pagamentos**
   - Copie a **assinatura secreta** → Vercel `MERCADOPAGO_WEBHOOK_SECRET`.
4. Crie **contas de teste** (comprador) em *Contas de teste* e pague com elas.

Redeploy e pronto: os botões "Cartão (Stripe)" e "Pix / Mercado Pago" aparecem na loja.

## A.6 Rodar no seu computador (grátis)

```bash
git clone https://github.com/fabferna/meu-rpg-online-html.git
```
```bash
cd meu-rpg-online-html && npm install
```
```bash
cp .env.example .env.local
```
Preencha o `.env.local` (pode usar `PAYMENTS_DEV=1` para testar compras localmente) e rode:
```bash
npm run dev
```

---

# PARTE B — Produção com domínio pago (quando houver orçamento)

Custo mínimo mensal estimado para operar comercialmente: **~US$ 45/mês + domínio (~R$ 40/ano)**.

## B.1 Comprar o domínio

| Tipo | Onde | Preço aprox. |
|---|---|---|
| `.com.br` | <https://registro.br> (precisa CPF/CNPJ) | R$ 40/ano |
| `.com` / `.gg` / `.io` | <https://www.cloudflare.com/products/registrar/> (preço de custo) | US$ 10–30/ano |

Escolha um nome curto, ex.: `aethelgard.com.br`.

## B.2 Cloudflare na frente (Free) — DNS, DDoS, WAF

1. Crie conta em <https://dash.cloudflare.com> → **Add a site** → `aethelgard.com.br` → plano **Free**.
2. A Cloudflare mostra 2 **nameservers**. No Registro.br: **Domínio → DNS → Alterar servidores DNS** → cole os dois. Aguarde (minutos a 24h).
3. **DNS → Records** (aponte para a Vercel):

   | Tipo | Nome | Conteúdo | Proxy |
   |---|---|---|---|
   | `A` | `@` | `76.76.21.21` | 🟠 Proxied |
   | `CNAME` | `www` | `cname.vercel-dns.com` | 🟠 Proxied |

4. Na Vercel → **Settings → Domains → Add** → `aethelgard.com.br` e `www.aethelgard.com.br` (redirecione `www` → raiz).
5. **SSL/TLS na Cloudflare**:
   - **Overview → Encryption mode: Full (strict)** ⚠️ (Flexible causa loop de redirecionamento).
   - **Edge Certificates**: **Always Use HTTPS** ✅, **Automatic HTTPS Rewrites** ✅, **Minimum TLS 1.2**, **HSTS** ✅ (max-age 6 meses, include subdomains).
6. **Security → Settings**: Security Level **Medium**; **Bot Fight Mode** ✅.
7. **Security → WAF → Custom rules** (5 grátis):
   1. **Liberar webhooks** (senão o gateway é bloqueado):
      `(http.request.uri.path wildcard "/api/webhooks/*")` → **Skip** (todas as proteções gerenciadas e Bot Fight).
   2. **Desafiar países sem jogadores** (opcional):
      `(not ip.src.country in {"BR" "PT" "US"}) and (http.request.uri.path wildcard "/api/*")` → **Managed Challenge**.
   3. **Bloquear ferramentas de scan:**
      `(http.user_agent contains "sqlmap") or (http.user_agent contains "nikto")` → **Block**.
8. **Security → WAF → Rate limiting rules** (1 grátis):
   `(http.request.uri.path wildcard "/api/*") and not (http.request.uri.path wildcard "/api/webhooks/*")` → **100 requisições / 10 s por IP** → Block 10 s.
9. **Caching → Cache Rules**: `/assets/*` e `/_next/static/*` → **Eligible for cache**, Edge TTL 1 mês. (A API nunca é cacheada: ela envia `Cache-Control: no-store`.)
10. Atualize **em todo lugar** a URL nova:
    - Vercel: `NEXT_PUBLIC_SITE_URL=https://aethelgard.com.br`
    - Supabase: Site URL + Redirect URL `https://aethelgard.com.br/auth/callback`
    - Google/Facebook: domínio autorizado
    - Stripe/Mercado Pago: URLs de webhook

## B.3 Planos pagos necessários para monetizar

| Serviço | Plano | Por quê |
|---|---|---|
| **Vercel Pro** (US$ 20/mês) | Os Termos do Hobby **proíbem uso comercial**. Assim que vender gemas, migre. Também dá mais execução de funções e otimização de imagens. |
| **Supabase Pro** (US$ 25/mês) | Backups diários, sem pausa por inatividade, 8 GB de banco, suporte. Ative **PITR** quando a receita justificar. |

Alternativa sem Vercel Pro: VPS própria (veja B.7).

## B.4 Banco de dados em produção

1. **Separe ambientes:** um projeto Supabase `aethelgard-dev` (testes) e outro `aethelgard-prod`. Nunca teste em produção.
2. **Migrações:** aplique os arquivos de `supabase/migrations/` em ordem. Para automatizar, use a CLI:
   ```bash
   npx supabase link --project-ref SEU_REF
   ```
   ```bash
   npx supabase db push
   ```
3. **Backups:** Pro faz diário automático (7 dias). Faça também um dump semanal fora do Supabase:
   ```bash
   pg_dump "postgresql://postgres:SENHA@db.SEU_REF.supabase.co:5432/postgres" -Fc -f backup_$(date +%F).dump
   ```
   **Teste restaurar** um backup num projeto de dev pelo menos uma vez.
4. **Conexões:** a app usa a API REST do Supabase (sem pool para gerenciar). Se um dia conectar direto no Postgres, use a URL do **pooler** (porta 6543).
5. **Segurança do banco:**
   - **Database → Network Restrictions**: restrinja conexões diretas ao seu IP.
   - **Advisors → Security Advisor**: rode e zere os alertas.
   - Senha do banco forte e só no gerenciador de senhas.
   - **Auth → Rate Limits**: mantenha os limites de cadastro/login ativos; ative **CAPTCHA** (hCaptcha/Turnstile grátis) em *Auth → Bot and Abuse Protection*.

## B.5 Pagamentos em produção

### Stripe
1. **Ative a conta** (dados pessoais/empresa, conta bancária para saque).
2. Troque `sk_test_` → `sk_live_` e recrie o webhook em **Live mode** (novo `whsec_`).
3. **Settings → Payment methods**: ative cartões; para BRL, avalie ativar **Pix** e **Boleto**.
4. **Radar** (antifraude) vem ligado — mantenha.

### Mercado Pago
1. **Credenciais de produção** (precisa homologar a aplicação: preencha site, ramo de atividade).
2. Troque o `MERCADOPAGO_ACCESS_TOKEN` e o webhook de produção (nova assinatura secreta).

### Teste de ponta a ponta (obrigatório antes de divulgar)
- [ ] Comprar o menor pacote com cartão real → gemas chegam em < 30 s.
- [ ] Mesmo teste com Pix.
- [ ] Reembolsar pelo painel → gemas são removidas.
- [ ] Ver em `payments` (Table Editor) os status `paid` → `refunded`.

## B.6 Segurança do servidor e operação

- **Segredos:** só nas *Environment Variables* da Vercel (marcadas como *Sensitive*). Nunca no código, nunca no `NEXT_PUBLIC_*`, nunca em prints.
- **Rotação:** se suspeitar de vazamento, gere nova `service_role` (Supabase → API Keys → *Roll*), novas chaves Stripe/MP e faça redeploy.
- **2FA** ligado em: GitHub, Vercel, Supabase, Cloudflare, Stripe, Mercado Pago, Google, Facebook, Registro.br.
- **GitHub:** proteja o `main` (*Settings → Branches → Require pull request*), ative **Dependabot** e **Secret scanning**.
- **Monitoramento grátis:**
  - Erros: **Sentry** (plano grátis) — `npx @sentry/wizard@latest -i nextjs`.
  - Uptime: **UptimeRobot** (grátis) pingando `/` a cada 5 min.
  - Logs: Vercel → *Logs*; Supabase → *Logs Explorer*.
- **Alertas de fraude:** consulte periodicamente:
  ```sql
  select user_id, sum(delta) from ledger where currency='gems' and created_at > now() - interval '1 day' group by 1 order by 2 desc limit 20;
  ```
- **Contas marcadas:** `select * from profiles where is_banned;` (estornos após gastar gemas).

## B.7 Alternativa: VPS própria (sem Vercel)

Para quem prefere um custo fixo (ex.: Hetzner/Contabo ~€5/mês):

1. Ubuntu 24.04, crie usuário sem root, SSH só por chave, `ufw allow 22,80,443`, `fail2ban`.
2. Instale Node 22 e PM2; `npm ci && npm run build && pm2 start "npm start" --name aethelgard`.
3. Nginx como proxy reverso para `localhost:3000` + **Certbot** (`certbot --nginx -d aethelgard.com.br`) para SSL grátis com renovação automática.
4. Cloudflare na frente com **Full (strict)** e, para esconder o IP do servidor, aceite só IPs da Cloudflare no `ufw` (ou use **Cloudflare Tunnel**, grátis).
5. Atualizações automáticas: `unattended-upgrades`.

## B.8 Jurídico (LGPD / CDC)

- **Termos de Uso** e **Política de Privacidade** publicados e linkados no cadastro e na loja (exigidos também pelo Facebook/Google).
- Informe quais dados coleta (e-mail, dados de jogo), por quê, e como pedir exclusão.
- **Direito de arrependimento (CDC art. 49):** já informado na loja; atenda reembolsos de gemas não usadas em até 7 dias.
- Emissão de nota fiscal: ao faturar, formalize (MEI atende no início — consulte um contador).

---

## ✅ Checklist de lançamento

- [ ] Migrações 0001–0013 aplicadas no Supabase de produção
- [ ] Variáveis de ambiente na Vercel (sem `PAYMENTS_DEV`)
- [ ] Login por e-mail, Google e Facebook testados
- [ ] Criar herói → missão → caçada → PVP → loja funcionando
- [ ] Webhooks Stripe e Mercado Pago com assinatura configurada
- [ ] Compra real + reembolso testados
- [ ] Upstash configurado
- [ ] (B) Domínio + Cloudflare Full (strict) + regra WAF liberando `/api/webhooks/*`
- [ ] (B) Vercel Pro + Supabase Pro antes de vender
- [ ] 2FA em todas as contas
- [ ] Termos e Política de Privacidade no ar

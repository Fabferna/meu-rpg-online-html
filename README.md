# Aethelgard Online

RPG de navegador (estilo menus/missões/PVP) feito com **Next.js 15 + Supabase**.

![capa](public/capa_readme.png)

## Arquitetura

```
Navegador (React)  ──►  Next.js (rotas /api, server components)  ──►  Supabase Postgres
  só exibe estado          valida (Zod), rate limit, regras do jogo        RLS + funções atômicas
  e envia "intenções"      usa service_role para escrever                  ledger de moedas
```

**Regras de segurança (Fase 1):**

| Ameaça | Defesa |
|---|---|
| Editar ouro/XP pelo Console | O cliente **não tem permissão de escrita** em nenhuma tabela (RLS + `REVOKE`). Toda escrita é feita pelo backend via funções SQL (`wallet_apply`, `create_character`) executáveis só pela `service_role`. |
| Mandar campos extras (`"gold": 99999`) | Schemas Zod `.strict()` — o cliente envia só nome/raça/região/gênero; atributos e ouro são calculados no servidor. |
| Acelerar energia mudando o relógio | Energia é derivada de `energy_updated_at` usando o horário do **servidor** (`src/lib/game/rules.ts`). |
| Saldo negativo / gasto duplo | `CHECK (gold >= 0)`, lock de linha e `ledger.ref` único (idempotência para webhooks de pagamento). |
| Ver dados de outro jogador | Policies `user_id = auth.uid()`. |
| CSRF / clickjacking / XSS | Checagem de `Origin` nas rotas POST, cookies SameSite, CSP, `X-Frame-Options: DENY`. |
| Bots / spam | Rate limit por usuário (Upstash Redis em produção, memória em dev). |
| Vazar a chave secreta | `SUPABASE_SERVICE_ROLE_KEY` só é lida em módulos `server-only`. |

## Estrutura

```
src/app/            páginas (/, /login, /criar-personagem, /jogo) e rotas /api
src/lib/game/       dados do mundo e regras puras (XP, HP, energia)
src/lib/supabase/   clientes: browser (anon), server (sessão), admin (service_role)
src/lib/security/   rate limit, CSRF, redirect seguro
src/middleware.ts   renova sessão e protege rotas
supabase/migrations esquema SQL + RLS
public/assets/      imagens do jogo
legacy/             versão HTML original (referência; será removida ao fim da migração)
```

## Rodando localmente

1. **Crie um projeto** em <https://supabase.com> (plano grátis serve).
2. No painel: **SQL Editor → New query**, cole `supabase/migrations/0001_init.sql` e rode.
3. Copie as chaves: **Project Settings → API**.
   ```bash
   cp .env.example .env.local   # e preencha os valores
   ```
4. **Auth → URL Configuration**: Site URL `http://localhost:3000` e adicione `http://localhost:3000/auth/callback` em *Redirect URLs*.
5. **Auth → Providers**:
   - **Email**: já vem ativo (deixe "Confirm email" ligado).
   - **Google**: crie um OAuth Client em <https://console.cloud.google.com/apis/credentials> (tipo *Web*), com redirect URI `https://SEU-PROJETO.supabase.co/auth/v1/callback`. Cole Client ID/Secret no Supabase.
   - **Facebook**: crie um app em <https://developers.facebook.com> → *Facebook Login* → Valid OAuth Redirect URI `https://SEU-PROJETO.supabase.co/auth/v1/callback`. Cole App ID/Secret no Supabase.
6. Instale e rode:
   ```bash
   npm install
   npm run dev
   ```
   Abra <http://localhost:3000>.

## Roadmap

- [x] **Fase 1** — Next.js, Supabase, login (e-mail/Google/Facebook), RLS, criação de personagem no servidor
- [ ] **Fase 2** — Missões com timer, combate PVE/PVP, níveis, inventário, UI animada
- [ ] **Fase 3** — Gemas (premium), recarga de energia, loja de cosméticos, ofertas limitadas, Stripe/Mercado Pago
- [ ] **Fase 4** — `DEPLOY.md` (domínio, SSL, Cloudflare, banco em produção)

# 🛡️ Segurança — Aethelgard Online

Relatório da auditoria de segurança (pentest) realizada em **06/11/2026** sobre o código do repositório e o ambiente de produção `https://meu-rpg-online-html.vercel.app`.

## Como reportar uma vulnerabilidade

Envie um e-mail para o contato informado nos [Termos de Uso](https://meu-rpg-online-html.vercel.app/termos) com os passos para reproduzir. Não teste contra contas de outros jogadores.

---

## 1. Escopo e método

| Fase | O que foi feito | Ferramentas |
|---|---|---|
| 1. Preparação | Auditoria de dependências, lint de segurança, varredura de segredos, scripts de ataque | `npm audit`, `eslint-plugin-security`, `semgrep` (regras locais), `detect-secrets` |
| 2. Caixa-branca | Revisão das 58 rotas da API, das funções SQL e das políticas RLS; banco local com as 15 migrações e os privilégios padrão do Supabase | Postgres 16 local, revisão manual |
| 3. Caixa-preta/cinza | 47 ataques contra a **produção** (21 sem sessão + 26 com uma conta de teste), XSS verificado num navegador real | `scripts/security/pentest.mjs`, `curl`, Playwright |
| 4. Mitigação | Correções abaixo, cabeçalhos reforçados, este relatório | — |

Comandos para repetir a auditoria:

```bash
npm run audit:prod      # dependências de produção
npm run lint:security   # padrões de código perigosos
npm run secrets:scan    # chaves/senhas no repositório
BASE=https://meu-rpg-online-html.vercel.app npm run pentest
BASE=... COOKIE="sb-...-auth-token=<cookie de uma conta de TESTE>" npm run pentest
```

---

## 2. Arquitetura de segurança (o que já protegia o jogo)

- **Toda a lógica no servidor.** O navegador só informa a *intenção* (ex.: "atacar", "comprar item X"). Preços, recompensas, dano, XP, energia e drops vêm do catálogo do servidor; o cliente nunca envia valores.
- **Wrapper `action()` em toda rota que altera estado:** checagem de `Origin` (anti-CSRF) → sessão válida → limite de requisições por jogador → validação Zod **`.strict()`** (campo extra = erro 400).
- **Banco fechado:** tabelas só com políticas `SELECT` do próprio dono (RLS); nenhuma permissão de `INSERT/UPDATE/DELETE` para `anon`/`authenticated`. As 57 funções `SECURITY DEFINER` só podem ser executadas pela `service_role` (servidor).
- **Dinheiro com idempotência:** `ledger` com referência única, `reward_claims` com chave única, `fulfill_payment` só aceita pagamento `pending` e com valor/moeda idênticos aos cobrados.
- **Webhooks assinados:** Stripe e Mercado Pago com HMAC + comparação em tempo constante + janela de 5 minutos; o status do pagamento é sempre consultado na API oficial.
- **Batalha com concorrência otimista** (`version`): dois cliques simultâneos não contam duas vezes.
- **Chat:** filtro de palavrões (PT/EN/ES/ZH), links bloqueados, denúncias com ocultação automática, mute/ban pelo admin. Renderização apenas como texto (React escapa HTML).

---

## 3. Resultados dos testes

### 3.1 Segredos expostos — ✅ nenhum
Código atual e **todo o histórico do git** varridos (Supabase `service_role`/`sb_secret_`, Stripe `sk_`/`whsec_`, Mercado Pago `APP_USR-`/`TEST-`, JWTs). Só `.env.example` (vazio) está versionado. Os 4 alertas do `detect-secrets` eram falsos positivos (exemplo `SENHA` no `DEPLOY.md` e hashes SRI em páginas legadas). A chave `service_role` só é importada em código de servidor.

### 3.2 Isolamento entre jogadores (RLS) — ✅ seguro
Teste com o jogador A tentando acessar o jogador B direto no banco:

| Tentativa | Resultado |
|---|---|
| Ler carteira, personagem, inventário, pagamentos, ledger de B | 0 linhas |
| `update wallets set gold = 999999` | permissão negada |
| Inserir carteira / alterar nível / apagar personagem | permissão negada |
| Executar `grant_rewards` direto | permissão negada |
| Ler a view `ranking` direto | permissão negada |

### 3.3 Manipulação de pacotes — ✅ seguro (produção)
Criar herói com `gold: 999999`, missão com energia negativa, compra com `price: 0`, checkout de R$ 0,01, ataque com `damage: 999999`, habilidade direto no nível 5, doar −500 ou 99.999.999 de ouro → **todos recusados**. Pontos de atributo inexistentes, capítulo fora de ordem, nível do passe não alcançado e skin de outra raça → recusados pelo servidor. **Saldo antes/depois: idêntico.**

### 3.4 Injeção (SQL/NoSQL) — ✅ seguro
`' OR 1=1 --`, `"; drop table characters; --`, `{"$ne":null}` em parâmetros de missão e na busca de guildas → tratados como texto (o acesso ao banco é feito por consultas parametrizadas do Supabase e por IDs validados contra o catálogo).

### 3.5 XSS — ✅ seguro
`<script>alert(1)</script>`, `<img src=x onerror=alert(1)>` e `javascript:alert(1)` enviados ao chat e abertos num Chromium real: exibidos como texto, nenhum alerta e nenhum elemento injetado. Não há `dangerouslySetInnerHTML`, `eval` nem `new Function` no código.

### 3.6 Controle de acesso — ✅ seguro
Rotas de jogo sem sessão → 401. `/admin` e `/api/admin/*` com conta comum → 404. Requisição com `Origin` de outro site → 403. Webhooks sem assinatura → 400.

### 3.7 Condições de corrida — ✅ seguro (com ajuste)
10 resgates simultâneos do login diário → ouro creditado **1 vez**. 8 inícios simultâneos de missão → **1 missão**, energia descontada 1 vez.

---

## 4. Vulnerabilidades encontradas e correções

| # | Vulnerabilidade | Gravidade | Status |
|---|---|---|---|
| V1 | **Open redirect no login.** `safeNextPath` aceitava `/\t/evil.com` (ou `%09`): o parser de URL remove tab/quebra de linha e o resultado vira `//evil.com`. Um link `/login?next=/%09/site-falso` mandava o jogador para um site de phishing **depois** de logar. | 🟠 Média | ✅ Corrigido |
| V2 | **Erro 500 em pedidos simultâneos repetidos** (ex.: login diário). A integridade era mantida pela chave única do banco, mas a violação virava "erro interno" em vez de 409. | 🟡 Baixa | ✅ Corrigido |
| V3 | **Busca de nome com coringas.** `ilike(name, entrada)` em gerenciar guilda, moderação, duelo PVP e convites: `J%` casava com "qualquer nome iniciado por J". As permissões continuavam sendo checadas no SQL. | 🟡 Baixa | ✅ Corrigido |
| V4 | **PostCSS vulnerável** (GHSA-qx2v-qp2m-jg93 e outros) via Next.js. Afeta só o processamento de CSS no build, não o jogo em execução. | 🟡 Baixa | ✅ Corrigido |
| V5 | **Cabeçalhos de isolamento ausentes** (COOP/CORP) e CSP sem `upgrade-insecure-requests`. | 🟡 Baixa | ✅ Corrigido |
| V6 | **IDs internos de conta (`user_id`)** visíveis no chat em tempo real e na lista de membros de guilda. Um UUID não dá acesso a nada (não é credencial). | ℹ️ Info | Aceito (ver §6) |

### Detalhe das correções

- **V1** — `src/lib/security/safePath.ts`: lista de caracteres permitidos (só caminho interno), recusa `//`, `/\`, caracteres de controle e suas versões codificadas (`%00`–`%1F`, `%5C`, `%7F`). Usada no servidor (`/auth/callback`) **e** no formulário de login. Casos testados: `//evil.com`, `/\evil.com`, `/\t/evil.com`, `/\n/evil.com`, `/%09/evil.com`, `/%5Cevil.com`, `https://evil.com`, `javascript:` → todos voltam para `/jogo`.
- **V2** — `src/lib/api.ts`: violação de chave única (`23505`) passa a responder `409 already_claimed`.
- **V3** — busca exata (`eq` em coluna `citext`, sem diferenciar maiúsculas) e validação do nome por regex `^[A-Za-zÀ-ÿ0-9_]{3,16}$` em `guilds/action`, `admin/moderate`, `pvp/fight` e `referrals/claim`.
- **V4** — `overrides.postcss = ^8.5.32` no `package.json`. `npm audit --omit=dev` → **0 vulnerabilidades**.
- **V5** — `next.config.ts` (abaixo).

---

## 5. Cabeçalhos de segurança (`next.config.ts`)

| Cabeçalho | Valor | Protege contra |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'`; scripts só do próprio site; conexões só para o site e o Supabase; `frame-ancestors 'none'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `upgrade-insecure-requests` | XSS, injeção de scripts de terceiros, exfiltração de dados |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | rebaixamento para HTTP, interceptação |
| `X-Frame-Options` | `DENY` | clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | vazamento de URLs |
| `Permissions-Policy` | câmera, microfone e localização desligados | abuso de APIs do navegador |
| `Cross-Origin-Opener-Policy` | `same-origin` | ataques via `window.opener` (tabnabbing, XS-Leaks) |
| `Cross-Origin-Resource-Policy` | `same-origin` | outros sites embutindo nossos recursos |
| `X-DNS-Prefetch-Control` / `X-Permitted-Cross-Domain-Policies` | `off` / `none` | vazamento via DNS / Flash-PDF |
| `X-Powered-By` | removido | fingerprinting |

---

## 6. Riscos aceitos e próximos passos

- **`script-src 'unsafe-inline'`** é exigido pelos scripts inline do Next.js. A evolução é CSP com *nonce* por requisição no middleware (custa o cache estático das páginas). Mitigação atual: React escapa todo conteúdo de usuário e não há `dangerouslySetInnerHTML`.
- **`user_id` visível (V6):** o RLS do chat de guilda depende da coluna `user_id` de `guild_members`, e o Realtime envia a linha inteira. Um UUID não permite acessar nem alterar nada.
- **Recomendações operacionais:** 2FA em GitHub, Vercel, Supabase, Stripe e Mercado Pago; `SUPABASE_SERVICE_ROLE_KEY` e chaves de pagamento só na Vercel como *Sensitive*; rotacionar chaves em caso de suspeita (ver `DEPLOY.md`); rodar `npm run audit:prod` e `npm run pentest` antes de cada lançamento grande.

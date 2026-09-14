# Silvério Barbearia — Sistema de Gestão

Monorepo do sistema de gestão da barbearia. Este repositório está na **Fase 1**
(fundação): só a API (`apps/api`) existe — auth dos sócios, CRUD de serviços e cadastro
de barbeiros/disponibilidade. Sem frontend, sem agendamentos, sem WhatsApp ainda (ver
`planejamento-geral.md` para o mapa completo das fases).

Stack: Cloudflare Workers (Hono) + Neon Postgres (Drizzle ORM) + Zod. Detalhe completo e
justificativas em [`00-arquitetura-e-convencoes.md`](00-arquitetura-e-convencoes.md).

## Rodando localmente

Pré-requisitos: Node.js 20+, uma conta Neon (free, sem cartão de crédito) com um projeto
de desenvolvimento criado.

```bash
npm install
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

Edite `apps/api/.dev.vars` com:

- `DATABASE_URL`: string de conexão do seu projeto Neon de **desenvolvimento** (não o de
  produção). Formato: `postgresql://usuario:senha@ep-exemplo.regiao.aws.neon.tech/banco?sslmode=require`.
- `SESSAO_SECRETO`: qualquer valor aleatório forte (ex.: `openssl rand -base64 48`). Não é
  usado para assinar o cookie nesta fase (a sessão é validada por token opaco persistido
  no banco — ver `apps/api/src/shared/sessao/sessao.util.ts`), mas já fica reservado nos
  bindings para uso futuro (ex.: assinar outros tokens).

Aplique a migração no banco de desenvolvimento:

```bash
npm run db:migrate
```

Suba o servidor local:

```bash
npm run dev:api
```

A API sobe em `http://localhost:8787` (Wrangler dev). Como as rotas de login setam
cookie com `Secure`, use um navegador que aceite cookies `Secure` em `localhost`
(Chrome/Edge fazem isso) — em `curl`, use `--cookie-jar`/`--cookie` normalmente, o
atributo `Secure` não impede o `curl` de enviar/receber.

## Variáveis de ambiente

| Variável | Onde configurar | Descrição |
|---|---|---|
| `DATABASE_URL` | `.dev.vars` (local) / `wrangler secret put DATABASE_URL` (produção) | String de conexão Neon (Postgres). |
| `SESSAO_SECRETO` | `.dev.vars` (local) / `wrangler secret put SESSAO_SECRETO` (produção) | Segredo reservado para uso futuro em tokens assinados. |
| `AMBIENTE` | `wrangler.toml` (`[vars]`) | Não sensível, informativo (`desenvolvimento`/`producao`). |

**Nunca** commitar `DATABASE_URL` ou `SESSAO_SECRETO` — `.dev.vars` e `.env` já estão no
`.gitignore`. Em produção, configure via `wrangler secret put <NOME>`, nunca em
`wrangler.toml`.

## Rotas prontas (Fase 1)

Todas as respostas são JSON. Rotas protegidas exigem o cookie de sessão (`silverio_sessao`),
obtido via `/api/auth/login`.

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| GET | `/api/saude` | Nenhuma | Health check. |
| POST | `/api/auth/registrar-socio` | Nenhuma (bootstrap único) | Cria o primeiro (e só o primeiro) usuário-sócio. Recusa com 403 se `usuarios` já tiver algum registro. |
| POST | `/api/auth/login` | Nenhuma | `{ telefone, senha }` → seta cookie de sessão (30 dias). |
| POST | `/api/auth/logout` | Sessão | Encerra a sessão atual (remove do banco e limpa o cookie). |
| GET | `/api/servicos?ativos=1` | Sessão | Lista serviços; `ativos=1` filtra só os ativos. |
| POST | `/api/servicos` | Sessão | Cria serviço. |
| PUT | `/api/servicos/:id` | Sessão | Edita serviço (campos parciais). |
| DELETE | `/api/servicos/:id` | Sessão | Soft delete (`ativo = false`) — nunca apaga de verdade. |
| GET | `/api/barbeiros` | Sessão | Lista barbeiros (com nome/telefone do usuário associado). |
| PUT | `/api/barbeiros/:id` | Sessão | `{ ativo: boolean }` — ativa/desativa barbeiro. |
| GET | `/api/barbeiros/:id/disponibilidade` | Sessão | Lista a disponibilidade semanal do barbeiro. |
| PUT | `/api/barbeiros/:id/disponibilidade` | Sessão | `{ disponibilidade: [{ diaSemana, horaInicio, horaFim }] }` — substitui a semana inteira (apaga e recria). |

## Comportamento de bootstrap único (`registrar-socio`)

`POST /api/auth/registrar-socio` só funciona **uma vez por banco**: antes de criar
qualquer usuário, a rota verifica se `usuarios` já tem algum registro e recusa com `403`
se tiver. Isso existe para impedir que a rota vire uma porta aberta de criação de conta
com acesso total, caso o deploy fique no ar antes de alguém lembrar de removê-la — o
código impede sozinho, não depende de disciplina operacional.

Como `usuarios` é exclusiva de sócios (ver decisão em
`00-arquitetura-e-convencoes.md`), essa checagem continua válida para sempre: depois do
bootstrap inicial dos 2 sócios, a tabela nunca mais deveria crescer por essa rota.

**Se precisar recriar os sócios do zero em um ambiente já usado** (ex.: ambiente de
desenvolvimento): apague as linhas correspondentes em `usuarios` (o `ON DELETE` das FKs
de `barbeiros`/`sessoes` não está em cascata — apague primeiro os registros dependentes
em `barbeiros` e `sessoes`) ou resete o banco de desenvolvimento inteiro. **Nunca**
"reabrir" a rota em produção editando o código — isso reabriria a porta que a checagem
existe para fechar.

## Checklist antes de ir para produção

1. Criar um projeto Neon **real** de produção (free, sem cartão de crédito — 100
   CU-horas/mês e 0,5 GB de armazenamento; ver `00-arquitetura-e-convencoes.md`).
2. Gerar um `SESSAO_SECRETO` real (aleatório, forte) e configurar via
   `wrangler secret put SESSAO_SECRETO`.
3. Configurar `DATABASE_URL` de produção via `wrangler secret put DATABASE_URL`.
4. Aplicar a migração no banco real: `DATABASE_URL=<url-de-producao> npm run db:migrate`.
5. Cadastrar os 2 sócios via `POST /api/auth/registrar-socio` **imediatamente após o
   deploy, antes de qualquer outra pessoa conseguir acessar a URL pública** — a rota se
   fecha sozinha depois do primeiro registro, mas até lá qualquer um que descobrir a URL
   poderia se cadastrar como sócio.
6. Usar **roteamento por caminho único sob o mesmo domínio**
   (`dominio.com.br/api/*` → Worker, resto → Pages) em vez de subdomínios separados para
   front e API. Ver a nota operacional sobre cookies em
   `00-arquitetura-e-convencoes.md`: sem isso (ou sem o atributo `Domain` explícito no
   cookie, se optar por subdomínios mesmo assim), o login pode não funcionar em
   produção.

## Testando o fluxo completo manualmente

Com o servidor local rodando (`npm run dev:api`):

```bash
# 1. Registrar o primeiro sócio
curl -i -X POST http://localhost:8787/api/auth/registrar-socio \
  -H "Content-Type: application/json" \
  -d '{"nome":"Sócio Um","telefone":"11999990001","senha":"senha-forte-123"}'

# 2. Login (guarda o cookie em cookies.txt)
curl -i -c cookies.txt -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"telefone":"11999990001","senha":"senha-forte-123"}'

# 3. Criar serviço (rota protegida — usa o cookie salvo)
curl -i -b cookies.txt -X POST http://localhost:8787/api/servicos \
  -H "Content-Type: application/json" \
  -d '{"nome":"Corte","valorCentavos":5000,"duracaoMinutos":30}'

# 4. Listar barbeiros para pegar o id e editar a disponibilidade
curl -s -b cookies.txt http://localhost:8787/api/barbeiros

curl -i -b cookies.txt -X PUT http://localhost:8787/api/barbeiros/1/disponibilidade \
  -H "Content-Type: application/json" \
  -d '{"disponibilidade":[{"diaSemana":1,"horaInicio":"09:00","horaFim":"18:00"}]}'

# 5. Logout
curl -i -b cookies.txt -X POST http://localhost:8787/api/auth/logout

# 6. Confirmar que uma rota protegida agora recusa (sem cookie válido)
curl -i http://localhost:8787/api/servicos

# 7. Confirmar que um segundo registrar-socio é recusado (403)
curl -i -X POST http://localhost:8787/api/auth/registrar-socio \
  -H "Content-Type: application/json" \
  -d '{"nome":"Sócio Dois","telefone":"11999990002","senha":"outra-senha-123"}'
```

## Documentos do projeto

- [`planejamento-geral.md`](planejamento-geral.md) — histórico de decisões e mapa das
  fases.
- [`00-arquitetura-e-convencoes.md`](00-arquitetura-e-convencoes.md) — arquitetura, stack,
  convenções de código e regras não-negociáveis.
- [`01-fase1-fundacao.md`](01-fase1-fundacao.md) — escopo desta fase.

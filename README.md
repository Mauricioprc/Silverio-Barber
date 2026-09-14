# Silvério Barbearia — Sistema de Gestão

Monorepo do sistema de gestão da barbearia. Este repositório está na **Fase 2**
(agenda): só a API (`apps/api`) existe — auth dos sócios, CRUD de serviços, cadastro de
barbeiros/disponibilidade (Fase 1) e agora agendamentos + bloqueios de agenda com trava
de conflito de horário no próprio banco (Fase 2). Sem frontend, sem cadastro de cliente
final, sem WhatsApp ainda (ver `planejamento-geral.md` para o mapa completo das fases).

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
- `SESSAO_SECRETO`: qualquer valor aleatório forte (ex.: `openssl rand -base64 48`). Usado
  para assinar o cookie de sessão (`setSignedCookie`/`getSignedCookie` do Hono) — além do
  token opaco em si já ser validado contra a tabela `sessoes` no banco, a assinatura
  impede que o valor do cookie seja adulterado no cliente sem invalidar a assinatura.

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
| `SESSAO_SECRETO` | `.dev.vars` (local) / `wrangler secret put SESSAO_SECRETO` (produção) | Segredo usado para assinar o cookie de sessão. |
| `AMBIENTE` | `wrangler.toml` (`[vars]`) | Não sensível, informativo (`desenvolvimento`/`producao`). |

**Nunca** commitar `DATABASE_URL` ou `SESSAO_SECRETO` — `.dev.vars` e `.env` já estão no
`.gitignore`. Em produção, configure via `wrangler secret put <NOME>`, nunca em
`wrangler.toml`.

## Rotas prontas

Todas as respostas são JSON. Rotas protegidas exigem o cookie de sessão (`silverio_sessao`),
obtido via `/api/auth/login`.

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| GET | `/api/saude` | Nenhuma | Health check. |
| POST | `/api/auth/registrar-socio` | Nenhuma (bootstrap dos 2 primeiros sócios) | Cria um usuário-sócio enquanto houver menos de 2 em `usuarios`. Recusa com 403 a partir do 3º cadastro — sem fluxo alternativo. |
| POST | `/api/auth/login` | Nenhuma | `{ telefone, senha }` → seta cookie de sessão assinado (30 dias). |
| POST | `/api/auth/logout` | Sessão | Encerra a sessão atual (remove do banco e limpa o cookie). |
| GET | `/api/servicos?ativos=1` | Sessão | Lista serviços; `ativos=1` filtra só os ativos. |
| POST | `/api/servicos` | Sessão | Cria serviço. |
| PUT | `/api/servicos/:id` | Sessão | Edita serviço (campos parciais). |
| DELETE | `/api/servicos/:id` | Sessão | Soft delete (`ativo = false`) — nunca apaga de verdade. |
| GET | `/api/barbeiros` | Sessão | Lista barbeiros (com nome/telefone do usuário associado). |
| PUT | `/api/barbeiros/:id` | Sessão | `{ ativo: boolean }` — ativa/desativa barbeiro. |
| GET | `/api/barbeiros/:id/disponibilidade` | Sessão | Lista a disponibilidade semanal do barbeiro. |
| PUT | `/api/barbeiros/:id/disponibilidade` | Sessão | `{ disponibilidade: [{ diaSemana, horaInicio, horaFim }] }` — substitui a semana inteira (apaga e recria). |
| GET | `/api/agendamentos?barbeiro_id=&data=` | Sessão | Agenda diária de um barbeiro (`data` = `YYYY-MM-DD`). Ambos os parâmetros são obrigatórios. |
| POST | `/api/agendamentos` | Sessão | `{ barbeiroId, servicoId, nomeCliente, telefoneCliente, inicio }` — `inicio` no formato `"YYYY-MM-DD HH:MM"` (sem fuso, ver seção de horários abaixo). `fim` e `valorCobradoCentavos` são calculados/copiados do serviço no momento da criação. 409 se conflitar com outro agendamento/bloqueio do mesmo barbeiro. |
| PUT | `/api/agendamentos/:id` | Sessão | `{ barbeiroId?, inicio?, status? }` — reagenda (recalcula `fim`, refaz a trava de conflito) e/ou muda status (`confirmado`\|`cancelado`\|`concluido`). Não existe `DELETE` — ver seção abaixo. |
| GET | `/api/bloqueios?barbeiro_id=` | Sessão | Lista bloqueios; `barbeiro_id` opcional (filtra por barbeiro se informado). |
| POST | `/api/bloqueios` | Sessão | `{ barbeiroId, inicio, fim, motivo? }` — 409 se conflitar com um agendamento ou outro bloqueio do mesmo barbeiro. |
| DELETE | `/api/bloqueios/:id` | Sessão | Remove o bloqueio de verdade (não é soft delete — ver seção abaixo). |

## Horários sem fuso (`inicio`/`fim`)

Todas as colunas de horário de agenda (`agendamentos.inicio/fim`, `bloqueios_agenda.
inicio/fim`, `ocupacoes_barbeiro.inicio/fim`) são `timestamp` **sem timezone**. A
barbearia opera num único fuso (horário local do estabelecimento) — não há agendamento
entre fusos diferentes nesta fase — e a exclusion constraint de referência (regra 8 do
documento de convenções) usa `tsrange`, que é o tipo de range para `timestamp without
time zone` (`tstzrange` seria o certo para colunas com timezone). Por isso: envie/espere
`inicio`/`fim` como string `"YYYY-MM-DD HH:MM"` (segundos opcionais, `T` ou espaço como
separador), sempre já no horário local do estabelecimento, nunca com `Z`/offset.

## Trava de conflito: agendamento vs. bloqueio (decisão de modelagem da Fase 2)

A regra 8 do documento de convenções, na sua forma original, cobre só conflito
agendamento×agendamento — não cobre "um agendamento não pode cair dentro de um bloqueio
do mesmo barbeiro" (bloqueio×agendamento) nem bloqueio×bloqueio, porque uma exclusion
constraint do Postgres só enxerga uma tabela por vez, e `agendamentos`/`bloqueios_agenda`
são tabelas diferentes.

**Decisão adotada**: em vez de unificar as duas tabelas numa só (o que encheria cada uma
de colunas nulas específicas da outra — `servico_id`/`valor_cobrado_centavos` não fazem
sentido num bloqueio, `motivo` não faz sentido num agendamento), foi criada uma terceira
tabela estreita, `ocupacoes_barbeiro` (`barbeiro_id`, `inicio`, `fim`, `tipo`,
`agendamento_id?`, `bloqueio_id?`). Toda vez que um agendamento ou bloqueio é criado, uma
linha espelho é gravada aqui, **na mesma transação**. É só sobre `ocupacoes_barbeiro` que
vive a exclusion constraint (`ocupacoes_barbeiro_sem_sobreposicao`) — e como as 3
combinações de conflito (agendamento×agendamento, agendamento×bloqueio, bloqueio×bloqueio)
viram, cada uma, duas linhas nessa mesma tabela, uma única constraint cobre as três. Isso
continua sendo trava no banco, não só na aplicação (regra 8 cumprida também para o caso
agendamento×bloqueio, que ficava fora do escopo literal da regra 8 original).

Cancelar um agendamento (`PUT status=cancelado`) ou remover um bloqueio (`DELETE`) apaga a
linha correspondente em `ocupacoes_barbeiro` dentro da mesma transação — é isso que libera
o horário para reuso. Por isso a exclusion constraint **não** tem a cláusula
`WHERE status <> 'cancelado'` do SQL de referência da regra 8: aqui, "liberar o horário"
é a linha de ocupação deixar de existir, não um filtro na constraint.

## `DELETE` de agendamento não existe (soft delete via `status`)

Igual à regra 5 (soft delete de serviço), um agendamento nunca é apagado de verdade: ele é
dado histórico/financeiro (a Fase 3 soma faturamento em cima disso). Cancelar é
`PUT /api/agendamentos/:id` com `{ "status": "cancelado" }` — a linha continua existindo
em `agendamentos` para sempre, só a linha de ocupação correspondente é removida (ver seção
acima), liberando o horário. Um `DELETE /api/agendamentos/:id` intencionalmente não foi
implementado. Bloqueio é diferente: não é dado financeiro nem histórico, é só uma marcação
de indisponibilidade que deixou de existir — por isso `DELETE /api/bloqueios/:id` remove
de verdade.

## Comportamento de bootstrap (`registrar-socio`)

`POST /api/auth/registrar-socio` funciona **livremente só para os 2 primeiros sócios**:
antes de criar qualquer usuário, a rota conta quantos já existem em `usuarios` e recusa
com `403` a partir do 3º cadastro, sem nenhum fluxo alternativo de aprovação. Isso existe
para impedir que a rota vire uma porta aberta de criação de conta com acesso total, caso
o deploy fique no ar antes de alguém lembrar de removê-la/protegê-la — o código impede
sozinho, não depende de disciplina operacional.

Como `usuarios` é exclusiva de sócios (ver decisão em
`00-arquitetura-e-convencoes.md`), essa checagem continua válida para sempre: depois do
bootstrap inicial dos 2 sócios, a tabela nunca mais cresce por essa rota. O modelo de
negócio é de 2 sócios fixos (ver `planejamento-geral.md`), sem previsão de expansão do
quadro societário — se um 3º sócio um dia for necessário, isso é uma ação administrativa
pontual (acesso direto ao banco ou uma migração específica àquela época), não uma
funcionalidade da aplicação.

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
   A migração da Fase 2 (`0001_orange_colonel_america.sql`) já inclui
   `CREATE EXTENSION IF NOT EXISTS btree_gist;` como primeiro passo — pré-requisito da
   exclusion constraint (regra 8 do documento de convenções). Confirme que ela ativa sem
   erro no projeto Neon de produção específico (documentação da Neon indica suporte em
   todos os planos, mas vale confirmar — ver `00-arquitetura-e-convencoes.md`).
5. Cadastrar os 2 sócios via `POST /api/auth/registrar-socio` **imediatamente após o
   deploy, antes de qualquer outra pessoa conseguir acessar a URL pública** — a rota se
   fecha sozinha depois do 2º registro, mas até lá qualquer um que descobrir a URL
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

# 7. Registrar o segundo sócio (bootstrap ainda aberto, 2º de 2)
curl -i -X POST http://localhost:8787/api/auth/registrar-socio \
  -H "Content-Type: application/json" \
  -d '{"nome":"Sócio Dois","telefone":"11999990002","senha":"outra-senha-123"}'

# 8. Confirmar que um terceiro registrar-socio é recusado (403) — quadro de bootstrap fechado,
#    sem nenhum fluxo alternativo de aprovação
curl -i -X POST http://localhost:8787/api/auth/registrar-socio \
  -H "Content-Type: application/json" \
  -d '{"nome":"Sócio Três","telefone":"11999990003","senha":"outra-senha-123"}'
```

Fluxo de agenda (Fase 2) — logado como sócio 1 (`cookies.txt` do passo 2 acima):

```bash
# 9. Criar um agendamento (ajuste o id do serviço/barbeiro conforme os passos 3-4 acima)
curl -i -b cookies.txt -X POST http://localhost:8787/api/agendamentos \
  -H "Content-Type: application/json" \
  -d '{"barbeiroId":1,"servicoId":1,"nomeCliente":"Cliente Teste","telefoneCliente":"11988887777","inicio":"2026-09-20 09:00"}'

# 10. Tentar criar outro agendamento no mesmo horário/barbeiro — deve vir 409
curl -i -b cookies.txt -X POST http://localhost:8787/api/agendamentos \
  -H "Content-Type: application/json" \
  -d '{"barbeiroId":1,"servicoId":1,"nomeCliente":"Outro Cliente","telefoneCliente":"11977776666","inicio":"2026-09-20 09:00"}'

# 11. Ver a agenda do dia
curl -s -b cookies.txt "http://localhost:8787/api/agendamentos?barbeiro_id=1&data=2026-09-20"

# 12. Cancelar o agendamento (ajuste :id conforme a resposta do passo 9)
curl -i -b cookies.txt -X PUT http://localhost:8787/api/agendamentos/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"cancelado"}'

# 13. Criar um bloqueio (folga) e confirmar que ele agora conflita com um novo agendamento
curl -i -b cookies.txt -X POST http://localhost:8787/api/bloqueios \
  -H "Content-Type: application/json" \
  -d '{"barbeiroId":1,"inicio":"2026-09-20 09:00","fim":"2026-09-20 12:00","motivo":"Folga"}'

curl -i -b cookies.txt -X POST http://localhost:8787/api/agendamentos \
  -H "Content-Type: application/json" \
  -d '{"barbeiroId":1,"servicoId":1,"nomeCliente":"Cliente C","telefoneCliente":"11966665555","inicio":"2026-09-20 10:00"}'
# ^ 409 — cai dentro do bloqueio
```

Ver a seção "Teste de concorrência real" abaixo para o teste específico de duas requisições
simultâneas (feito com um script separado, não só `curl` sequencial).

## Teste de concorrência real (exclusion constraint)

O critério de pronto da Fase 2 pede um teste de concorrência real, não só teórico: duas
requisições `POST /api/agendamentos` disparadas ao mesmo tempo para o mesmo
barbeiro/horário devem resultar em uma criada e uma rejeitada pela constraint.

**Como foi testado**: como este ambiente de desenvolvimento não tem acesso a um projeto
Neon real, o teste foi feito contra um Postgres real (não simulado) rodado localmente via
[`embedded-postgres`](https://www.npmjs.com/package/embedded-postgres) (Postgres 18.4,
binário oficial, `libpq`/protocolo real — não um mock). O script:

1. Aplica os arquivos de migração reais do repositório (`0000_daffy_tomorrow_man.sql` e
   `0001_orange_colonel_america.sql`), sem modificação, na ordem do `_journal.json`.
2. Popula dados mínimos respeitando as FKs (`usuarios` → `barbeiros` → `servicos`).
3. Abre **duas conexões simultâneas**, cada uma numa transação própria, e dispara ao
   mesmo tempo (`Promise.allSettled`) a mesma sequência que a rota `POST /api/agendamentos`
   executa (`INSERT` em `agendamentos` + `INSERT` da linha-espelho em
   `ocupacoes_barbeiro`) para o mesmo `barbeiro_id`/horário.

**Resultado**: das duas transações concorrentes, exatamente 1 foi commitada e 1 foi
abortada pelo Postgres com `code=23P01` (`exclusion_violation`) na constraint
`ocupacoes_barbeiro_sem_sobreposicao` — confirmando `SELECT count(*) ... = 1` depois. O
mesmo script também confirmou, contra o schema real:

- Dois agendamentos adjacentes (sem overlap) no mesmo barbeiro: aceitos.
- Mesmo horário em barbeiros diferentes: aceito (não é conflito).
- Um bloqueio sobreposto a um agendamento existente do mesmo barbeiro: rejeitado
  (`23P01`) — valida a decisão de modelagem da seção anterior.
- `status` inválido em `agendamentos`: rejeitado pelo `CHECK agendamentos_status_valido`.
- `fim <= inicio`: rejeitado pelo `CHECK agendamentos_horario_valido`.
- Cancelar um agendamento (remover sua linha de `ocupacoes_barbeiro`) libera o horário
  para um novo bloqueio, e o histórico em `agendamentos` continua com a linha original
  (`status = 'cancelado'`, não apagada).

Isso não substitui testar contra o Neon real antes do deploy (comportamento de rede/
latência pode diferir), mas valida que a lógica da exclusion constraint e das demais
constraints está correta contra um Postgres de verdade, não só na leitura do SQL.

## Documentos do projeto

- [`planejamento-geral.md`](planejamento-geral.md) — histórico de decisões e mapa das
  fases.
- [`00-arquitetura-e-convencoes.md`](00-arquitetura-e-convencoes.md) — arquitetura, stack,
  convenções de código e regras não-negociáveis.
- [`01-fase1-fundacao.md`](01-fase1-fundacao.md) — escopo da Fase 1.
- [`01a-fase1-correcoes.md`](01a-fase1-correcoes.md) e
  [`01b-fase1-simplificar-bootstrap-socio.md`](01b-fase1-simplificar-bootstrap-socio.md) —
  correções pós-auditoria da Fase 1.
- [`03-fase2-agenda.md`](03-fase2-agenda.md) — escopo desta fase (agenda).

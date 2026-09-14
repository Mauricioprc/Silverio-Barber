# Silvério Barbearia — Sistema de Gestão

Monorepo do sistema de gestão da barbearia. Este repositório está na **Fase 5**
(testes e implantação — última fase de back-end): a API (`apps/api`) está completa —
auth dos sócios, CRUD de serviços, cadastro de barbeiros/disponibilidade (Fase 1),
agendamentos + bloqueios de agenda com trava de conflito de horário no próprio banco
(Fase 2), cadastro de cliente pelo balcão + lançamento financeiro automático (Fase 3),
cadastro/login público de cliente + verificação por WhatsApp + agendamento online +
confirmação/lembrete automático (Fase 4), e agora uma suíte de teste de integração
consolidada, estimativa de uso de CU-horas da Neon, estratégia de backup, configuração de
roteamento por domínio e um checklist de deploy único (Fase 5 —
[`CHECKLIST-DEPLOY.md`](CHECKLIST-DEPLOY.md)). Frontend fica como planejamento próprio, a
partir daqui (ver `planejamento-geral.md`).

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
| `WHATSAPP_MODO` | `wrangler.toml` (`[vars]`) ou `.dev.vars` | `"mock"` (padrão, inclusive se a variável não existir) ou `"real"`. Ver seção "EnviadorWhatsapp" abaixo. |
| `WHATSAPP_TOKEN` | `.dev.vars` (local) / `wrangler secret put WHATSAPP_TOKEN` (produção) | Token de acesso da WhatsApp Cloud API. Só exigido com `WHATSAPP_MODO=real`. |
| `WHATSAPP_PHONE_NUMBER_ID` | `.dev.vars` (local) / `wrangler secret put WHATSAPP_PHONE_NUMBER_ID` (produção) | Id do número de telefone configurado na Cloud API. Só exigido com `WHATSAPP_MODO=real`. |
| `WHATSAPP_TEMPLATE_CONFIRMACAO` | `wrangler.toml` (`[vars]`) | Nome do template aprovado pela Meta para a confirmação automática. Sem essa variável, usa `"confirmacao_agendamento"` (só funciona de verdade depois que esse nome for aprovado e configurado). |
| `WHATSAPP_TEMPLATE_LEMBRETE` | `wrangler.toml` (`[vars]`) | Nome do template aprovado para o lembrete automático. Sem essa variável, usa `"lembrete_agendamento"`. |

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
| POST | `/api/agendamentos` | Sessão | `{ barbeiroId, servicoId, clienteId? \| (nomeCliente + telefoneCliente), inicio }` — `inicio` no formato `"YYYY-MM-DD HH:MM"` (sem fuso, ver seção de horários abaixo). `fim` e `valorCobradoCentavos` são calculados/copiados do serviço no momento da criação; se `clienteId` for informado, nome/telefone vêm do cadastro (ver seção "Vínculo com cliente" abaixo). 409 se conflitar com outro agendamento/bloqueio do mesmo barbeiro. |
| PUT | `/api/agendamentos/:id` | Sessão | `{ barbeiroId?, inicio?, status? }` — reagenda (recalcula `fim`, refaz a trava de conflito) e/ou muda status (`confirmado`\|`cancelado`\|`concluido`). Concluir gera lançamento financeiro automático (ver seção abaixo); reverter a conclusão remove o lançamento. Não existe `DELETE` — ver seção abaixo. |
| GET | `/api/bloqueios?barbeiro_id=` | Sessão | Lista bloqueios; `barbeiro_id` opcional (filtra por barbeiro se informado). |
| POST | `/api/bloqueios` | Sessão | `{ barbeiroId, inicio, fim, motivo? }` — 409 se conflitar com um agendamento ou outro bloqueio do mesmo barbeiro. |
| DELETE | `/api/bloqueios/:id` | Sessão | Remove o bloqueio de verdade (não é soft delete — ver seção abaixo). |
| GET | `/api/clientes?busca=` | Sessão | Lista/busca clientes; `busca` (opcional) filtra por nome ou telefone (`ILIKE`). |
| POST | `/api/clientes` | Sessão | `{ nome, telefone, senha }` — cadastro feito pelo balcão/staff. 409 com `"Telefone já cadastrado."` se o telefone já existir (erro específico, não genérico — ver seção abaixo). |
| PUT | `/api/clientes/:id` | Sessão | `{ nome?, telefone?, senha? }` — edita campos parciais. |
| GET | `/api/financeiro/resumo?de=&ate=&barbeiro_id=` | Sessão | Total consolidado (`totalCentavos`) no período; todos os filtros são opcionais. Sem `barbeiro_id`, soma os dois sócios (visão, não repartição). |
| GET | `/api/financeiro/lancamentos?de=&ate=&barbeiro_id=` | Sessão | Lista os lançamentos financeiros do período, mesmos filtros opcionais. |
| GET | `/api/agendamentos/:id/link-whatsapp` | Sessão | Devolve `{ url }` — link `wa.me` pronto (item 5 da Fase 4, botão de envio manual). Não depende de `EnviadorWhatsapp`. |
| POST | `/api/interno/lembretes/enviar` | Sessão | Dispara "agora" os lembretes de agendamentos confirmados de amanhã com opt-in (ver seção de lembrete abaixo) — acionado manualmente por um sócio nesta fase; um cron real (Fase 5+) chamaria a mesma lógica. |
| POST | `/api/publico/clientes/cadastro` | Nenhuma | `{ nome, telefone, senha }` — cadastro público. Se o telefone já existir em `clientes` (balcão, Fase 3), vincula à conta em vez de duplicar. Seta cookie de sessão de cliente. |
| POST | `/api/publico/clientes/login` | Nenhuma | `{ telefone, senha }` — mesma lógica de sessão persistente (30 dias) do login de sócio, cookie próprio de cliente. |
| POST | `/api/publico/clientes/logout` | Sessão de cliente | Encerra a sessão do cliente. |
| POST | `/api/publico/clientes/verificacao/enviar` | Sessão de cliente | Gera e envia (via `EnviadorWhatsapp`) um código de 6 dígitos para o telefone **do cliente da sessão** (nunca de um telefone informado no corpo). Rate-limit da regra 7 — ver seção abaixo; `429` com `Retry-After` se excedido. |
| POST | `/api/publico/clientes/verificacao/confirmar` | Sessão de cliente | `{ codigo }` — confirma o código mais recente; marca `telefone_verificado = true`. Erro genérico (`400`) se errado/expirado/já usado. |
| GET | `/api/publico/servicos` | Nenhuma | Lista serviços ativos — vitrine da página pública. |
| GET | `/api/publico/barbeiros` | Nenhuma | Lista barbeiros ativos (só `id`+`nome` — sem telefone, que é dado interno). |
| GET | `/api/publico/disponibilidade?barbeiro_id=&data=` | Nenhuma | Horários livres do dia, cruzando `disponibilidade_barbeiro` com `ocupacoes_barbeiro`. |
| POST | `/api/publico/agendamentos` | Sessão de cliente | `{ barbeiroId, servicoId, inicio, aceitaMensagensAutomaticas? }` — exige `telefone_verificado = true` (`403` com `precisaVerificar: true` se não estiver); mesma trava de conflito da Fase 2. `clienteId` vem sempre da sessão. |

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

`editarAgendamento` sempre apaga a linha de ocupação atual e a recria se o novo status for
diferente de `cancelado` — não só quando horário/barbeiro mudam. Isso é necessário para
cobrir **reativar** um agendamento cancelado (`status: cancelado` → `confirmado`, sem
mudar horário): a ocupação tinha sido removida no cancelamento anterior, e sem recriá-la a
trava de conflito ficaria desligada para aquele agendamento — confirmado com um teste real
contra Postgres (ver seção de teste de concorrência) que, antes dessa correção, permitia
dois agendamentos confirmados sobrepostos nesse cenário específico.

## `DELETE` de agendamento não existe (soft delete via `status`)

Igual à regra 5 (soft delete de serviço), um agendamento nunca é apagado de verdade: ele é
dado histórico/financeiro (a Fase 3 soma faturamento em cima disso). Cancelar é
`PUT /api/agendamentos/:id` com `{ "status": "cancelado" }` — a linha continua existindo
em `agendamentos` para sempre, só a linha de ocupação correspondente é removida (ver seção
acima), liberando o horário. Um `DELETE /api/agendamentos/:id` intencionalmente não foi
implementado. Bloqueio é diferente: não é dado financeiro nem histórico, é só uma marcação
de indisponibilidade que deixou de existir — por isso `DELETE /api/bloqueios/:id` remove
de verdade.

## Vínculo de agendamento com cliente cadastrado (Fase 3)

`POST /api/agendamentos` aceita `clienteId` opcional, além (ou em vez) de
`nomeCliente`/`telefoneCliente`. Quando `clienteId` é informado, nome/telefone gravados no
agendamento vêm **do cadastro** (`clientes`), não do que veio no corpo da requisição —
mesmo que `nomeCliente`/`telefoneCliente` também tenham sido enviados, eles são ignorados
nesse caso, para não gravar um contato desencontrado do cadastro real. Sem `clienteId`,
`nomeCliente` e `telefoneCliente` continuam obrigatórios (contato avulso, comportamento da
Fase 2 inalterado — o balcão pode criar um agendamento sem cadastrar cliente).

O vínculo é **opcional e não retroativo**: agendamentos criados na Fase 2 (antes de
`clienteId` existir) continuam com `clienteId = null` para sempre — não há nenhuma
migração de dados para tentar casá-los com clientes cadastrados depois, conforme pedido
explicitamente no escopo da Fase 3.

Clientes são cadastrados pelo balcão/staff (rota protegida por login de sócio,
`POST /api/clientes`) — não existe autoatendimento nesta fase (isso é Fase 4, com a
página pública). Diferente do erro de login de sócio (regra 3 — propositalmente genérico),
`POST /api/clientes` com telefone já cadastrado responde `409` com uma mensagem
específica (`"Telefone já cadastrado."`): quem está cadastrando é o sócio no balcão, não o
próprio cliente tentando adivinhar se um telefone alheio já tem conta, então não há o
mesmo motivo para generalizar o erro.

## Lançamento financeiro automático ao concluir um agendamento (Fase 3)

Ao mudar o status de um agendamento para `concluido` (`PUT /api/agendamentos/:id`), uma
linha é criada automaticamente em `lancamentos_financeiros`, copiando `barbeiro_id` e o
`valor_cobrado_centavos` do agendamento (mesma lógica de cópia da regra 5 — o valor
gravado é o que foi cobrado *daquele* agendamento, não o preço atual do serviço).

**Decisão de comportamento** (pedida explicitamente pelo escopo da Fase 3, para o caso de
o status de um agendamento concluído ser alternado): reverter o status de `concluido` para
qualquer outro valor **remove** o lançamento correspondente — não fica um lançamento
"órfão" referenciando um agendamento que não está mais concluído. Se o agendamento for
concluído de novo depois, um novo lançamento é criado. Isso mantém
`lancamentos_financeiros` sempre consistente com "agendamentos com status = concluido
agora", ao custo de não preservar histórico de lançamentos que foram revertidos (não havia
exigência de manter esse histórico no escopo desta fase — se isso vier a ser necessário,
é uma mudança de modelagem futura, não desta fase).

A não-duplicação (idempotência) é garantida por uma constraint `unique()` real em
`lancamentos_financeiros.agendamento_id` — o `INSERT` usa `ON CONFLICT (agendamento_id) DO
NOTHING`, não uma checagem "existe?" antes de inserir (que seria vulnerável a corrida sob
concorrência, o mesmo motivo pelo qual a trava de conflito de horário da Fase 2 usa
constraint de banco em vez de checagem na aplicação).

`GET /api/financeiro/resumo` e `GET /api/financeiro/lancamentos` filtram por `de`/`ate`
(datas `YYYY-MM-DD`, no calendário de **Brasília** — a aplicação roda no horário de
Brasília, UTC-3 fixo, já que o Brasil aboliu o horário de verão em 2019) e por
`barbeiro_id` opcional. Diferente das tabelas de agenda (que gravam horário local "naive",
sem timezone), `lancamentos_financeiros.criado_em` é um instante real (`timestamp with
time zone`), então o filtro converte a fronteira do dia local para UTC explicitamente
(meia-noite em Brasília = `03:00 UTC`, não `00:00 UTC`) — ver
`shared/fuso/fuso.util.ts` (movido de `modules/financeiro/` na Fase 4, quando o módulo
`lembretes` passou a precisar da mesma conversão). Sem `barbeiro_id`, o resultado é o
consolidado dos dois sócios — é visão, não repartição (decisão de negócio já fechada,
seção 2 do `planejamento-geral.md`): o sistema não calcula nem armazena nenhuma
divisão/comissão automática entre sócios.

## `EnviadorWhatsapp`: mock vs. real (Fase 4)

Todo envio de WhatsApp passa pela interface `EnviadorWhatsapp`
(`shared/whatsapp/enviador-whatsapp.ts`), nunca chamado direto — porque a aprovação da
conta comercial da Meta e a contratação do provedor/BSP têm prazo próprio e podem não
estar prontos quando este código roda (ver `05-fase4-agendamento-online-whatsapp.md`).

- **`EnviadorWhatsappMock`** (padrão — usado sempre que `WHATSAPP_MODO` não é
  exatamente `"real"`, inclusive se a variável não existir): não faz nenhuma chamada de
  rede, só loga a mensagem (`console.log`) e guarda em `mensagensEnviadas` (útil para
  testes). Com isso, todo o resto do fluxo (cadastro, verificação, rate-limiting,
  agendamento, opt-in) funciona e é testável sem depender da Meta.
- **`EnviadorWhatsappMetaCloudApi`** (`WHATSAPP_MODO=real`): chama a WhatsApp Cloud API
  da Meta (`graph.facebook.com`) diretamente via `fetch`. Se o BSP contratado expuser uma
  API diferente da Cloud API direta, troque só esta classe — a interface
  `EnviadorWhatsapp` (e todo o resto do código que a usa) não muda.

**Checklist para ligar o `EnviadorWhatsapp` real em produção**:

1. Conta comercial WhatsApp aprovada pela Meta, com o número de telefone configurado.
2. Template(s) de mensagem aprovados — um para confirmação, outro para lembrete (duas
   aprovações separadas da conta em si, com prazos próprios — ver
   `planejamento-geral.md`). Anote os nomes exatos aprovados.
3. Confirmar com o provedor/BSP escolhido se ele suporta "Coexistência" (permite manter
   o app comum do WhatsApp Business no celular de quem atende, em paralelo à API — ver
   nota operacional no fim de `05-fase4-agendamento-online-whatsapp.md`); se sim, o app
   precisa ser aberto pelo menos 1x por semana, ou a API desconecta.
4. Configurar via `wrangler secret put`: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`.
5. Configurar em `wrangler.toml` (`[vars]`, não sensível): `WHATSAPP_MODO=real`,
   `WHATSAPP_TEMPLATE_CONFIRMACAO=<nome aprovado>`, `WHATSAPP_TEMPLATE_LEMBRETE=<nome
   aprovado>`.
6. Testar manualmente um envio de cada tipo (verificação, confirmação, lembrete) antes
   de considerar em produção de verdade.

## Verificação de telefone por WhatsApp e rate-limiting (regra 7)

`POST /api/publico/clientes/verificacao/enviar` gera um código de 6 dígitos (hash SHA-256
gravado, nunca texto puro — `codigos_verificacao.codigo_hash`), válido por 10 minutos, e
envia via `EnviadorWhatsapp` para o telefone **do cliente da sessão** — a rota nunca
aceita um telefone vindo do corpo da requisição, de propósito: aceitar um telefone
arbitrário no corpo transformaria essa rota numa forma de mandar WhatsApp de graça (às
custas da barbearia) pra qualquer número, sem nenhuma conta por trás. Isso é uma decisão
de segurança além do que o prompt da Fase 4 pediu literalmente, mas segue diretamente do
motivo da própria regra 7 ("cada envio custa dinheiro real via Meta").

**Limites aplicados** (`modules/verificacao/verificacao.service.ts`):

- No máximo **3 envios por cliente a cada 15 minutos** (regra 7).
- **Backoff crescente** entre envios consecutivos do mesmo cliente: o 1º envio na janela
  é livre; o 2º exige pelo menos **60s** desde o anterior; o 3º exige pelo menos **180s**
  desde o anterior. A partir do 4º dentro da janela de 15 min, bloqueado até o envio mais
  antigo sair da janela.
- Limite complementar de **10 envios por IP a cada 15 minutos** (regra 7) — mais frouxo,
  só dificulta abuso via vários telefones/contas a partir da mesma origem; o limite por
  cliente é a defesa principal. IP obtido de `CF-Connecting-IP` (populado pela Cloudflare,
  mais confiável que `X-Forwarded-For`).
- Excedido qualquer limite, a resposta é `429` com `{ erro, retryAfterSegundos }` e header
  `Retry-After` — nenhum código é gerado nem mensagem enviada.

**Teste real do rate-limiting** (pedido explicitamente no critério de pronto da Fase 4):
como o driver `@neondatabase/serverless` só fala com o proxy da Neon (não com Postgres
genérico — mesma limitação já documentada nas fases anteriores), o teste foi feito
reimplementando a lógica de `enviarCodigoVerificacao` fielmente em SQL puro contra um
Postgres 18.4 real (`embedded-postgres`), com as migrações reais do repositório aplicadas,
disparando 4 tentativas em sequência controlada para o mesmo cliente:

| Tentativa | Tempo decorrido | Resultado |
|---|---|---|
| 1ª | t=0s | **Aceita** |
| 2ª | t=5s (< 60s exigidos) | Rejeitada (backoff) |
| 2ª (retry) | t=65s (≥ 60s) | **Aceita** |
| 3ª | t=95s (< 180s exigidos desde a 2ª) | Rejeitada (backoff) |
| 3ª (retry) | t=275s (≥ 180s) | **Aceita** |
| 4ª | dentro dos 15 min, já 3 aceitas | **Rejeitada** (limite de janela) |

Resultado: exatamente 3 códigos gravados no banco, a 4ª tentativa (e as duas tentativas
prematuras) corretamente rejeitadas — confirmado consultando `codigos_verificacao`
diretamente, não assumido pela leitura do código. O mesmo teste confirmou também: código
correto marca `telefone_verificado = true`; reusar um código já confirmado falha (`usado_
em` preenchido); cadastro público com telefone já existente em `clientes` (Fase 3, balcão)
atualiza o registro existente em vez de duplicar.

## Opt-in de mensagem automática (regra 9)

`aceitaMensagensAutomaticas` é um campo booleano **por agendamento** (coluna em
`agendamentos`, não uma preferência permanente em `clientes`) — decisão de modelagem da
Fase 4: consentimento por agendamento é a leitura mais segura de "nunca inferir
consentimento implicitamente", permite que o cliente consinta num agendamento específico
sem que isso valha para todos os futuros, e deixa claro no histórico exatamente para qual
agendamento o consentimento valeu.

`default(false)`: omitir o campo, ou mandar qualquer valor que não seja exatamente `true`
(Zod já rejeita não-booleanos), é tratado como **não** consentiu — nunca assumido `true`
por omissão. Só quando `true` é enviado explicitamente é que
`POST /api/publico/agendamentos` dispara a mensagem de confirmação automática via
`EnviadorWhatsapp`. Agendamentos criados pelo balcão (`POST /api/agendamentos`, sócio
logado) também aceitam o campo (mesma coluna), mas normalmente ficam `false` — regra 9
é sobre o canal público, mas uma única coluna cobre os dois casos sem duplicar schema.

## Lembrete automático (função testável isoladamente)

`modules/lembretes/lembretes.service.ts` expõe `obterAgendamentosParaLembrete(db, agora)`
— uma função pura de leitura que decide "quem precisa de lembrete agora": agendamentos
`confirmado` do dia seguinte (calculado em horário de Brasília a partir de `agora`) com
`aceitaMensagensAutomaticas = true`. Separada de `enviarLembretes` (que de fato chama
`EnviadorWhatsapp` para cada um), conforme pedido no escopo da Fase 4 — o mecanismo de
disparo automático (cron do Workers ou equivalente) **não** foi implementado nesta fase;
por enquanto, `POST /api/interno/lembretes/enviar` (protegida por login de sócio) aciona
manualmente. Ligar um cron de verdade (Fase 5+) é só chamar essa mesma rota (ou a função
`enviarLembretes` diretamente) periodicamente.

## Botão de envio manual (`wa.me`) — independente da automação

`GET /api/agendamentos/:id/link-whatsapp` (protegida por login de sócio, na visão de
agenda) devolve `{ url }` pronta para abrir — item 5 da Fase 4. A montagem da mensagem/URL
é uma função pura (`modules/agendamentos/mensagemManual.util.ts`, sem chamada de rede) que
não depende de `EnviadorWhatsapp`, do rate-limiting (regra 7) nem do opt-in (regra 9): é o
sócio mandando manualmente, revisando/personalizando antes de clicar enviar no WhatsApp
Web/app dele — a regra 9 só vale para o envio *automático*. Continua funcionando mesmo com
`EnviadorWhatsapp` em modo mock/sem credenciais reais, e continua disponível depois que a
automação estiver funcionando — não é uma etapa transitória, é uma alternativa permanente
(decisão de produto registrada em `planejamento-geral.md`).

## Vínculo automático de cliente pré-cadastrado (cadastro público)

`POST /api/publico/clientes/cadastro` verifica se o telefone já existe em `clientes`
(cadastro feito pelo balcão na Fase 3, com uma senha que o próprio cliente não conhece).
Se existir, **vincula à conta existente** em vez de tentar criar um segundo registro — o
que violaria a constraint única de telefone e, pior, criaria duas contas para a mesma
pessoa. Resposta `200` nesse caso (vs. `201` para cadastro novo de verdade), com
`{ clienteId, vinculado: true }`.

**Correção pós-auditoria (a versão original desta rota tinha uma falha de segurança
real)**: a versão original trocava `senhaHash`/`nome` da conta existente imediatamente,
sem nenhuma verificação — bastava alguém saber o telefone de um cliente já cadastrado
(dado que não é segredo) para assumir a conta, e pior, `telefone_verificado` ficava
intocado, então se o cliente real já tinha verificado o telefone antes, o atacante
herdava esse `true` e podia agendar imediatamente, sem precisar provar posse do telefone
em momento nenhum. Confirmado explorando o cenário de verdade contra Postgres real antes
de corrigir.

**Comportamento atual**: ao vincular a uma conta existente, `nome`/`senhaHash` **não são
trocados na hora** — ficam pendentes em `clientes.nomePendente`/`senhaHashPendente`, e
`telefoneVerificado` é forçado para `false` (mesmo que já fosse `true`). Uma sessão de
cliente é iniciada normalmente (para permitir chamar as rotas de verificação em seguida),
mas até o telefone ser confirmado de verdade via código por WhatsApp
(`POST /api/publico/clientes/verificacao/confirmar`), a conta continua com a senha/nome
originais (os que o balcão cadastrou) — só quem de fato recebe o código no telefone real
consegue completar a verificação e, nesse momento, `confirmarCodigoVerificacao`
(`verificacao.service.ts`) aplica o nome/senha pendentes e limpa os dois campos. Um
atacante que só sabe o telefone pode chamar `/cadastro` e criar a solicitação pendente,
mas nunca consegue completá-la sem receber o código no telefone de verdade.

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

A partir da Fase 5, o checklist de deploy completo (banco, segredos, WhatsApp, domínio,
backup, bootstrap dos sócios, testes finais) vive num documento único:
**[`CHECKLIST-DEPLOY.md`](CHECKLIST-DEPLOY.md)** — não fica mais espalhado entre as
seções de cada fase deste README. Consulte-o diretamente na hora do deploy real; as
seções abaixo (estimativa de CU-horas, backup, roteamento) têm o detalhe técnico que o
checklist referencia.

## Estimativa de uso de CU-horas (Neon, plano free) — Fase 5

O plano free da Neon dá **100 CU-horas/mês** (verificado na documentação oficial:
"enough to run a 0.25 CU compute in a project for 400 hours/month" — ou seja, o cálculo
é `CU-horas = tamanho do compute (CU) × horas em que ele ficou acordado`, não horas
corridas do mês). Autosuspend obrigatório após 5 min de inatividade — cada requisição
reseta esse contador, então o compute fica "acordado" continuamente durante qualquer
janela em que as requisições cheguem com menos de 5 min de intervalo entre si, e volta a
dormir só depois de 5 min sem nenhuma.

**Premissas** (documentadas explicitamente — não é uma medição real, é projeção):

- Tamanho de compute: **0,25 CU** — o mínimo do autoscaling do plano free. Assumido
  porque o volume de tráfego deste sistema (CRUD simples, poucos usuários simultâneos)
  não tem motivo pra disparar o autoscaling da Neon pra cima sob uso normal; se isso se
  mostrar errado na prática, a estimativa toda sobe proporcionalmente.
- Barbearia aberta ~9h/dia, 6 dias/semana ≈ 26 dias úteis/mês — durante esse horário,
  assumido que o uso do sistema pelo balcão (agenda, criar agendamento, financeiro) é
  frequente o bastante pra manter o compute acordado a janela toda (intervalos < 5 min
  entre requisições), não só picos isolados.
- A página pública de agendamento (Fase 4) fica acessível 24h/dia — tráfego fora do
  horário comercial (alguém navegando/agendando à noite) é esperado, mas mais esparso;
  estimado em ~1h/dia adicional de compute acordado por esse motivo, espalhado pelos
  dias abertos.

**Cálculo**: (26 dias × 9h) + (26 dias × 1h) ≈ 260h de compute acordado/mês × 0,25 CU ≈
**65 CU-horas/mês (≈ 65% do teto)**.

**Cenário mais pessimista** (mais realista de se planejar para, dado que o negócio pode
crescer): barbearia aberta 7 dias/semana em vez de 6, jornada de 10h em vez de 9h, e mais
tráfego público fora do horário (~2h/dia) — dá (30×10 + 30×2) × 0,25 ≈ **90 CU-horas/mês
(≈ 90% do teto)**.

**Conclusão**: a faixa projetada (65-90%+) **não é uma folga confortável** — está
exatamente na zona que o critério desta fase pede pra tratar como recomendação explícita
de upgrade, não como "provavelmente vai dar certo". Ver `CHECKLIST-DEPLOY.md` para a
ação recomendada (acompanhar uso real no painel da Neon nas primeiras semanas em
produção e orçar upgrade para um plano pago antes de bater no teto, não depois).
Fonte: [Neon plans](https://neon.com/docs/introduction/plans) (100 CU-horas/mês, 400h de
compute 0,25 CU, verificado em 14/09/2026).

## Estratégia de backup — Fase 5

O plano free da Neon inclui **point-in-time restore (PITR) de 6 horas**, automático, sem
nenhuma configuração adicional (verificado na documentação oficial: "6-hour limit,
capped at 1 GB of change history" para o histórico de mudanças). Isso cobre bem o caso
"percebi um erro há poucas horas, quero voltar pra antes dele" — mas **não é suficiente
sozinho** para este projeto: é dado financeiro e de agendamento de um negócio real, e um
problema notado um dia (ou uma semana) depois do fato não seria recuperável só com essa
janela.

**Recomendação**: complementar com um export periódico próprio (`pg_dump`), independente
do PITR da Neon. Não é necessário rodar isso dentro do Worker (Workers não têm um
mecanismo de cron neste projeto ainda — ver `modules/lembretes/` na Fase 4, mesma
observação) — pode ser um job simples fora da infraestrutura de Workers (ex.: GitHub
Actions com um cron schedule, ou uma máquina/serviço externo qualquer com acesso à
`DATABASE_URL`):

```bash
pg_dump "$DATABASE_URL" --format=custom --file="backup-$(date +%Y%m%d-%H%M).dump"
```

- **Frequência recomendada**: diária, fora do horário comercial.
- **Retenção recomendada**: pelo menos 30 dias rolantes (a decidir com o proprietário se
  precisa de mais, considerando que é dado financeiro).
- **Importante**: gerar o export não basta — **testar a restauração** pelo menos uma vez
  antes do lançamento (`pg_restore` contra um banco Neon separado, de teste, e conferir
  que os dados batem), porque um backup nunca testado é uma suposição, não uma garantia.

Fonte: [Neon plans — Point-in-Time Restore](https://neon.com/docs/introduction/plans)
(6-hour PITR window no plano free, verificado em 14/09/2026).

## Roteamento por domínio único — configuração (Fase 5)

`apps/api/wrangler.toml` já tem um bloco `[env.production]` pronto para receber o
domínio real assim que for registrado (ver `CHECKLIST-DEPLOY.md`, seção de domínio):
`routes = [{ pattern = "<SEU-DOMINIO>/api/*", zone_name = "<SEU-DOMINIO>" }]` — os dois
`<SEU-DOMINIO>` precisam virar o domínio de verdade, e o domínio precisa já existir como
zona no Cloudflare antes do primeiro `npm run deploy:producao`. Uma rota de Worker tem
prioridade sobre o Cloudflare Pages para o padrão que ela cobre dentro da mesma zona —
não é necessária nenhuma configuração adicional do lado do Pages para ele "não pegar"
`/api/*`.

**Por que caminho único, não subdomínio** (`app.dominio.com.br` + `api.dominio.com.br`):
já registrado em `00-arquitetura-e-convencoes.md` — mesmo colocando os dois sob o mesmo
domínio-base, requisições entre subdomínios diferentes ainda tratam o cookie como
*host-only* por padrão (fica restrito ao host exato onde foi setado), a menos que o
atributo `Domain` seja setado explicitamente no cookie. Caminho único faz front e API
serem o mesmo origin do ponto de vista do navegador, evitando esse raciocínio por
completo — é por isso que este projeto nunca usou o atributo `Domain` no cookie, em
nenhuma das fases.

**Não foi possível validar isso de ponta a ponta neste ambiente** (exige um domínio real
registrado e uma zona Cloudflare de verdade, que este ambiente de desenvolvimento não
tem) — o `CHECKLIST-DEPLOY.md` (seção 6) tem o roteiro exato de validação manual pra
rodar contra o domínio real assim que ele existir: login, inspecionar o cookie no
DevTools (`Secure`/`HttpOnly`/`SameSite=Strict`, sem `Domain` explícito), e confirmar que
uma chamada a uma rota protegida a partir de uma página servida pelo Pages funciona sem
`401` — repetido tanto para o cookie de sócio quanto para o de cliente (são cookies
separados, ver seção de bootstrap/auth acima).

## Suíte de teste de integração consolidada (Fase 5)

`apps/api/scripts/teste-integracao.mjs` (`npm run test:integracao`, dentro de `apps/api`)
reúne num único script, permanente no repositório (não mais um script descartável rodado
manualmente a cada fase), os cenários de regressão identificados ao longo do projeto —
todos rodando contra um Postgres 18 **real** (`embedded-postgres`, mesmo mecanismo usado
nas verificações das Fases 2-4), com as migrações reais do repositório aplicadas:

- **Concorrência de agendamento** (Fase 2): dois `POST /api/agendamentos` simultâneos
  pro mesmo barbeiro/horário → 1 aceito, 1 rejeitado com `23P01`.
- **Reativar agendamento cancelado com conflito** (regressão do bug corrigido na Fase 2 —
  ver commit "Corrige reativação de agendamento cancelado sem recriar ocupação"): mudar
  o status de volta pra `confirmado` enquanto outro agendamento já ocupa o mesmo horário
  → rejeitado, `ocupacoes_barbeiro` continua sincronizada.
- **Agendamento dentro de um bloqueio existente** (Fase 2): rejeitado.
- **Fluxo normal de verificação por WhatsApp** (Fase 4): cadastro → código → confirmação
  → `telefone_verificado = true`.
- **Regressão do sequestro de conta** (correção pós-auditoria da Fase 4): cadastro
  público com telefone já existente do balcão não troca nome/senha até o código ser
  confirmado, um "atacante" tentando adivinhar o código é rejeitado, e só a confirmação
  de verdade (com o código que teria ido pro telefone real) aplica os dados pendentes.
- **Rate-limiting** (regra 7, Fase 4): 4 tentativas de reenvio em sequência controlada →
  as 3 primeiras aceitas respeitando o backoff (60s/180s), a 4ª rejeitada por limite de
  janela — mesmo teste já feito isoladamente na Fase 4, agora parte permanente da suíte
  de regressão, não descartado.

**Por que reimplementar as queries em SQL puro em vez de importar os services de
verdade**: `db/client.ts` usa `@neondatabase/serverless` (`Pool`), que fala o protocolo
específico do proxy da Neon — não conecta a um Postgres genérico (confirmado na prática
já na Fase 1). O script reimplementa as sequências de operação relevantes (inserir/
apagar `ocupacoes_barbeiro` junto com `agendamentos`/`bloqueios_agenda` na mesma
transação, a lógica de rate-limit) deliberadamente próximas ao código real, para que uma
divergência de comportamento apareça como teste quebrado — ver comentário no topo do
próprio script para o detalhe completo.

**Resultado da última execução**: 16 de 16 cenários passaram.

**Primeira instalação**: `embedded-postgres` baixa um binário real do Postgres para a
sua plataforma (Windows/Mac/Linux, resolvido automaticamente pelo npm) como parte de
`npm install` — a instalação já vem pré-aprovada para Windows (`allowScripts` no
`package.json` da raiz); em outra plataforma, o npm pode pedir uma aprovação única de
script na primeira vez (`npm approve-scripts` — é o mecanismo de permissão de scripts de
instalação do próprio npm, não algo deste projeto), depois disso não pede de novo.

**Nota de ambiente (Windows)**: `embedded-postgres` ocasionalmente demorou a liberar a
porta TCP entre uma execução e outra neste ambiente de desenvolvimento (o processo
Postgres em si sempre funcionou normalmente — só o encerramento, via `pg.stop()`,
esporadicamente não retornava). O script usa uma porta aleatória a cada execução e força
sua própria saída ao final (não depende de `pg.stop()`/`client.end()` retornarem) para
não ficar pendurado por causa disso — mas se você notar uma execução travada sem
progresso por mais de ~1 minuto, é seguro interromper (Ctrl+C) e rodar de novo.

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

Fluxo de financeiro/cliente (Fase 3) — logado como sócio 1:

```bash
# 14. Cadastrar um cliente pelo balcão
curl -i -b cookies.txt -X POST http://localhost:8787/api/clientes \
  -H "Content-Type: application/json" \
  -d '{"nome":"Cliente Fiel","telefone":"11955554444","senha":"senha-do-cliente-123"}'

# 15. Buscar o cliente cadastrado
curl -s -b cookies.txt "http://localhost:8787/api/clientes?busca=Fiel"

# 16. Criar um agendamento vinculado ao cliente (ajuste :id conforme o passo 14)
curl -i -b cookies.txt -X POST http://localhost:8787/api/agendamentos \
  -H "Content-Type: application/json" \
  -d '{"barbeiroId":1,"servicoId":1,"clienteId":1,"inicio":"2026-09-21 09:00"}'

# 17. Concluir o agendamento (ajuste :id conforme o passo 16) — deve gerar lançamento financeiro
curl -i -b cookies.txt -X PUT http://localhost:8787/api/agendamentos/2 \
  -H "Content-Type: application/json" \
  -d '{"status":"concluido"}'

# 18. Conferir o lançamento e o resumo consolidado
curl -s -b cookies.txt "http://localhost:8787/api/financeiro/lancamentos"
curl -s -b cookies.txt "http://localhost:8787/api/financeiro/resumo"
curl -s -b cookies.txt "http://localhost:8787/api/financeiro/resumo?barbeiro_id=1"

# 19. Reverter o status — o lançamento deve desaparecer
curl -i -b cookies.txt -X PUT http://localhost:8787/api/agendamentos/2 \
  -H "Content-Type: application/json" \
  -d '{"status":"confirmado"}'
curl -s -b cookies.txt "http://localhost:8787/api/financeiro/lancamentos"
```

Fluxo público de cliente (Fase 4) — sem sessão de sócio, cookie próprio de cliente
(`cookies-cliente.txt`):

```bash
# 20. Cadastro público — se "11955554444" já existir em clientes (balcão), vincula em
#     vez de duplicar
curl -i -c cookies-cliente.txt -X POST http://localhost:8787/api/publico/clientes/cadastro \
  -H "Content-Type: application/json" \
  -d '{"nome":"Cliente Publico","telefone":"11955554444","senha":"senha-do-cliente-123"}'

# 21. Ver a vitrine pública (sem login)
curl -s http://localhost:8787/api/publico/servicos
curl -s http://localhost:8787/api/publico/barbeiros
curl -s "http://localhost:8787/api/publico/disponibilidade?barbeiro_id=1&data=2026-09-20"

# 22. Tentar agendar sem telefone verificado -> 403 com precisaVerificar:true
curl -i -b cookies-cliente.txt -X POST http://localhost:8787/api/publico/agendamentos \
  -H "Content-Type: application/json" \
  -d '{"barbeiroId":1,"servicoId":1,"inicio":"2026-09-20 11:00","aceitaMensagensAutomaticas":true}'

# 23. Enviar código de verificação (vai pro log do wrangler dev — EnviadorWhatsappMock)
curl -i -b cookies-cliente.txt -X POST http://localhost:8787/api/publico/clientes/verificacao/enviar

# 24. Confirmar com o código visto no log (ajuste o valor)
curl -i -b cookies-cliente.txt -X POST http://localhost:8787/api/publico/clientes/verificacao/confirmar \
  -H "Content-Type: application/json" \
  -d '{"codigo":"123456"}'

# 25. Agora o agendamento público funciona, e com opt-in dispara a confirmação (mock)
curl -i -b cookies-cliente.txt -X POST http://localhost:8787/api/publico/agendamentos \
  -H "Content-Type: application/json" \
  -d '{"barbeiroId":1,"servicoId":1,"inicio":"2026-09-20 11:00","aceitaMensagensAutomaticas":true}'

# 26. 4 tentativas rápidas de reenvio de código -> a 4ª deve vir 429 (ver seção de
#     rate-limiting abaixo para o teste feito contra Postgres real)
for i in 1 2 3 4; do
  curl -s -o /dev/null -w "tentativa $i: %{http_code}\n" -b cookies-cliente.txt \
    -X POST http://localhost:8787/api/publico/clientes/verificacao/enviar
done
```

Fluxo de sócio (link manual e lembretes) — logado como sócio:

```bash
# 27. Link wa.me pronto pra um agendamento (ajuste :id)
curl -s -b cookies.txt "http://localhost:8787/api/agendamentos/2/link-whatsapp"

# 28. Disparar lembretes manualmente (agendamentos confirmados de amanhã com opt-in)
curl -i -b cookies.txt -X POST http://localhost:8787/api/interno/lembretes/enviar
```

Ver a seção "Teste de concorrência real" abaixo para o teste específico de duas requisições
simultâneas (feito com um script separado, não só `curl` sequencial), e as seções
seguintes para a verificação equivalente do fluxo financeiro/cliente e do rate-limiting da
Fase 4.

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

## Verificação do fluxo financeiro/cliente (Fase 3)

O mesmo tipo de teste da seção anterior (Postgres real via `embedded-postgres`, arquivos
de migração reais do repositório — agora `0000`+`0001`+`0002`) foi usado para validar o
escopo da Fase 3:

- Telefone duplicado em `clientes`: rejeitado pela constraint `clientes_telefone_unique`
  (`code=23505`).
- Agendamento criado com `cliente_id` respeitando a FK para `clientes`.
- Concluir um agendamento (`status = 'concluido'`) e inserir o lançamento com
  `ON CONFLICT (agendamento_id) DO NOTHING`: cria exatamente 1 lançamento com o valor
  correto (copiado do agendamento).
- Repetir a mesma inserção (simulando "concluir" de novo sem sair do estado): continua
  exatamente 1 lançamento — idempotência confirmada pela constraint, não só pela lógica da
  aplicação.
- Reverter o status para `confirmado` e remover o lançamento (mesma lógica de
  `editarAgendamento`): lançamento removido, contagem volta a 0.
- Concluir de novo depois de revertido: cria um novo lançamento (não duplicado).
- Dois barbeiros com lançamentos distintos: resumo consolidado soma os dois
  (`8000` centavos), filtro `barbeiro_id=1` retorna só `5000`, `barbeiro_id=2` só `3000` —
  confirma que o filtro por sócio e o consolidado calculam certo sem repartição
  automática.

Todos os cenários acima rodaram com sucesso contra o Postgres real embarcado.

## Verificação da Fase 4 (rate-limiting, verificação, opt-in)

Mesma técnica das seções anteriores — Postgres 18.4 real via `embedded-postgres`,
migrações `0000`..`0003` reais do repositório aplicadas —, agora validando:

- **Rate-limiting (regra 7)**: o teste detalhado na seção "Verificação de telefone por
  WhatsApp e rate-limiting" acima — 4 tentativas em sequência controlada, exatamente 3
  aceitas (respeitando o backoff crescente de 60s/180s) e a 4ª rejeitada por limite de
  janela, confirmado consultando `codigos_verificacao` diretamente.
- **Vínculo automático de cadastro público**: telefone já existente em `clientes`
  (simulando um cliente do balcão da Fase 3) — a lógica de "atualiza em vez de duplicar"
  mantém exatamente 1 registro com esse telefone, com o nome atualizado para o que o
  cliente acabou de informar.
- **Confirmação de código**: código certo marca `telefone_verificado = true`; o mesmo
  código não pode ser confirmado uma segunda vez (`usado_em` já preenchido — código de
  uso único).
- **Opt-in (regra 9)**: um agendamento criado com `aceita_mensagens_automaticas = true`
  explícito grava `true`; um agendamento sem o campo grava `false` (o `DEFAULT` da
  coluna) — confirmando que a ausência do campo nunca é tratada como consentimento.
- **Disponibilidade pública**: dados de `disponibilidade_barbeiro` +
  `ocupacoes_barbeiro` prontos e corretos para o cálculo (a lógica pura de subtração de
  intervalos, `disponibilidade.util.ts`, foi testada isoladamente à parte, com Node puro
  — sem precisar de banco, já que não toca em SQL).
- A montagem do link `wa.me` (`mensagemManual.util.ts`) e o `EnviadorWhatsappMock`
  também foram exercitados isoladamente (via `tsx`, sem banco): a URL gerada decodifica
  para a mensagem esperada, com o telefone normalizado para o formato internacional
  (`55` + DDD + número), e o mock registra corretamente o que "enviaria".

Não foi possível (nem seria correto tentar, sem credenciais reais) testar
`EnviadorWhatsappMetaCloudApi` contra a API de verdade da Meta — isso só pode ser
validado depois que a conta comercial e o template estiverem aprovados, seguindo o
checklist da seção "`EnviadorWhatsapp`: mock vs. real" acima.

## Documentos do projeto

- [`planejamento-geral.md`](planejamento-geral.md) — histórico de decisões e mapa das
  fases.
- [`00-arquitetura-e-convencoes.md`](00-arquitetura-e-convencoes.md) — arquitetura, stack,
  convenções de código e regras não-negociáveis.
- [`01-fase1-fundacao.md`](01-fase1-fundacao.md) — escopo da Fase 1.
- [`01a-fase1-correcoes.md`](01a-fase1-correcoes.md) e
  [`01b-fase1-simplificar-bootstrap-socio.md`](01b-fase1-simplificar-bootstrap-socio.md) —
  correções pós-auditoria da Fase 1.
- [`03-fase2-agenda.md`](03-fase2-agenda.md) — escopo da Fase 2 (agenda).
- [`04-fase3-financeiro-cliente.md`](04-fase3-financeiro-cliente.md) — escopo da Fase 3
  (financeiro e cadastro de cliente).
- [`05-fase4-agendamento-online-whatsapp.md`](05-fase4-agendamento-online-whatsapp.md) —
  escopo da Fase 4 (agendamento online + WhatsApp).
- [`06-fase5-testes-implantacao.md`](06-fase5-testes-implantacao.md) — escopo desta fase
  (testes e implantação).
- [`CHECKLIST-DEPLOY.md`](CHECKLIST-DEPLOY.md) — checklist único de deploy (Fase 5).

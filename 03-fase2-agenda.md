# Prompt — Fase 2: Agenda (Silvério Barbearia)

Cole este prompt no Claude Code junto com o documento `00-arquitetura-e-convencoes.md`.
Se o Claude Code já tiver acesso ao repositório da Fase 1, use o schema e as convenções já
existentes como base — não recrie o que já foi construído e verificado.

Ponto de partida: a Fase 1 já está implementada e verificada (banco com `usuarios`,
`barbeiros`, `disponibilidade_barbeiro`, `servicos`; autenticação dos sócios; CRUD de
serviços; cadastro de barbeiros/disponibilidade). Esta fase constrói em cima disso.

## Contexto do negócio

A regra mais crítica desta fase: dois clientes (ou o próprio sócio por engano) nunca
podem reservar o mesmo barbeiro no mesmo horário. Isso precisa ser garantido pelo próprio
banco de dados, não só pela lógica da aplicação — ver regra 8 do documento de convenções,
que já traz a sintaxe exata da constraint e o pré-requisito da extensão `btree_gist`.

## Escopo desta fase

1. **Extensão do banco**: habilitar `btree_gist` via migração
   (`CREATE EXTENSION IF NOT EXISTS btree_gist;`) antes de criar a tabela de agendamentos
   — ver regra 8 do documento de convenções para o motivo técnico.

2. **Schema do banco** (Drizzle):
   - `agendamentos`: id, barbeiro_id (FK), servico_id (FK), nome_cliente, telefone_cliente
     (ainda sem tabela `clientes` — essa só existe na Fase 3; nesta fase o agendamento
     registra o contato diretamente, sem vínculo com conta de usuário), inicio
     (timestamp), fim (timestamp, calculado a partir da duração do serviço no momento da
     criação — copiar `duracao_minutos` do serviço, não referenciar ao vivo, mesma lógica
     da regra 5 do documento de convenções, porque o serviço pode mudar de duração
     depois), status (`confirmado` | `cancelado` | `concluido`), valor_cobrado (copiado do
     serviço no momento da criação, mesma lógica), criado_em.
   - Exclusion constraint em `agendamentos`, exatamente como especificado na regra 8 do
     documento de convenções, restrita a `status <> 'cancelado'`.
   - `bloqueios_agenda`: id, barbeiro_id (FK), inicio (timestamp), fim (timestamp), motivo
     (texto livre — folga, feriado, etc.). Também precisa entrar na trava de conflito:
     um agendamento não pode ser criado dentro de um bloqueio do mesmo barbeiro. Decida e
     documente se isso é uma segunda exclusion constraint (agendamento vs. bloqueio
     tratados numa mesma tabela unificada de "ocupação", com uma coluna discriminando o
     tipo) ou uma verificação na aplicação antes de inserir — se optar por verificação na
     aplicação em vez de constraint, justifique explicitamente por que a regra 8 (trava
     no banco, não só na aplicação) não se aplica igual aqui.

3. **Rotas de agendamento** (protegidas por login — só os sócios operam a agenda nesta
   fase; agendamento público só existe na Fase 4):
   - `GET /api/agendamentos?barbeiro_id=&data=` — lista os agendamentos de um barbeiro
     num dia (visão de agenda diária).
   - `POST /api/agendamentos` — cria um agendamento. Deve calcular `fim` a partir da
     duração do serviço, copiar o valor do serviço, e tratar corretamente o erro do banco
     quando a exclusion constraint rejeitar um conflito (devolver uma mensagem de erro
     clara ao cliente da API, não vazar o erro bruto do Postgres).
   - `PUT /api/agendamentos/:id` — editar (reagendar: mudar horário/barbeiro) ou mudar
     status (cancelar, concluir). Reagendar deve passar pela mesma trava de conflito.
   - `DELETE /api/agendamentos/:id` — **não implementar como exclusão física**: use
     `PUT` para status `cancelado` (mesma lógica de soft delete da regra 5 — histórico de
     agendamento é dado financeiro/operacional relevante, não pode sumir). Documente essa
     decisão explicitamente no README, já que a ausência de um `DELETE` de verdade pode
     parecer omissão para quem não conhece a regra.

4. **Rotas de bloqueio de agenda** (protegidas por login):
   - `GET /api/bloqueios?barbeiro_id=` — listar.
   - `POST /api/bloqueios` — criar (respeitando a mesma trava de conflito com
     agendamentos existentes).
   - `DELETE /api/bloqueios/:id` — bloqueio pode ser removido de verdade (não é dado
     financeiro/histórico como agendamento — é só uma marcação de indisponibilidade que
     deixou de existir).

## Fora do escopo desta fase (não implementar ainda)

- Cadastro/login de cliente final e tabela `clientes` (Fase 3) — o agendamento nesta fase
  guarda nome/telefone soltos, sem vínculo com conta.
- Financeiro automático a partir do agendamento concluído, dashboard (Fase 3).
- Página pública de agendamento, verificação por WhatsApp, confirmação/lembrete
  automático, rate-limiting (regra 7) e opt-in (regra 9) (Fase 4).
- Frontend (`apps/web`).

## Entregáveis esperados

- Código completo seguindo a estrutura de pastas e nomenclatura do documento de
  convenções (novo módulo `agendamentos/`, e `bloqueios/` ou incorporado ao mesmo módulo
  se a modelagem escolhida no item 2 unificar as duas coisas — documentar a escolha).
- Migração Drizzle incluindo a criação da extensão, das tabelas e das exclusion
  constraints.
- Teste de concorrência real (não só teórico): duas requisições `POST /api/agendamentos`
  disparadas ao mesmo tempo para o mesmo barbeiro/horário devem resultar em uma criada e
  uma rejeitada pela constraint — documentar como esse teste foi feito e seu resultado no
  README.
- `README.md` atualizado: novas rotas (método/autenticação/descrição), decisão de
  modelagem de bloqueio vs. agendamento (item 2), e a explicação de por que não existe
  `DELETE` físico de agendamento.

## Critério de pronto

A Fase 2 está pronta quando: a extensão `btree_gist` está habilitada e a exclusion
constraint funciona de verdade sob concorrência (testada, não assumida), agendamentos
podem ser criados/reagendados/cancelados/concluídos respeitando a trava de conflito,
bloqueios de agenda impedem agendamento no mesmo intervalo, o soft delete de agendamento
está aplicado, e nenhuma regra do documento de convenções aplicável a esta fase foi
pulada.
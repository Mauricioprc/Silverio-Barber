# Prompt — Fase 3: Financeiro e Cadastro de Cliente (Silvério Barbearia)

Cole este prompt no Claude Code junto com o documento `00-arquitetura-e-convencoes.md`.
Use o schema e o código já existentes das Fases 1 e 2 como base — não recrie o que já foi
construído e verificado.

Ponto de partida: Fases 1 (usuários/sócios, barbeiros, serviços) e 2 (agendamentos,
bloqueios, trava de conflito) já estão implementadas e verificadas.

## Contexto do negócio

Cadastro de cliente nesta fase é feito **pelo balcão/staff** (presencial) — não existe
página pública ainda (isso é Fase 4). O dashboard mostra faturamento **consolidado** por
padrão, com filtro por sócio — sem repartição/divisão automática entre os dois (decisão
de negócio já fechada, ver `planejamento-geral.md`).

## Escopo desta fase

1. **Tabela `clientes`** (separada de `usuarios` — ver decisão registrada no documento de
   convenções sobre isolamento de permissão entre contas administrativas e de cliente):
   id, nome, telefone (único), senha_hash, telefone_verificado (boolean, default false —
   fica `false` até a Fase 4 implementar a verificação sob demanda), criado_em.
   Cadastro feito por rota protegida por login de sócio (é o balcão cadastrando, não
   autoatendimento):
   - `POST /api/clientes` — cria cliente. Validar telefone único (mesma regra de erro
     genérico não se aplica aqui, já que quem cadastra é o sócio, não o próprio cliente
     tentando adivinhar contas — pode retornar erro específico "telefone já cadastrado").
   - `GET /api/clientes` — listar/buscar (por nome ou telefone, útil pro balcão localizar
     um cliente rápido na hora de criar um agendamento).
   - `PUT /api/clientes/:id` — editar dados.
   Login de cliente (`POST /api/auth/cliente/login`) não é escopo desta fase — cliente
   ainda não tem canal próprio de acesso (isso é Fase 4, junto com a página pública).

2. **Vínculo de agendamento com cliente cadastrado** (opcional, não retroativo): a partir
   de agora, ao criar um agendamento (`POST /api/agendamentos`, já existente da Fase 2),
   aceitar um `cliente_id` opcional além dos campos `nome_cliente`/`telefone_cliente` já
   existentes — se informado, preenche nome/telefone a partir do cadastro; se não
   informado, mantém o comportamento atual (contato avulso, sem cadastro). Não migrar
   agendamentos antigos da Fase 2 para vincular a cliente — isso não é necessário e está
   fora de escopo.

3. **Registro financeiro automático**: ao mudar o status de um agendamento para
   `concluido` (rota já existente da Fase 2, `PUT /api/agendamentos/:id`), criar
   automaticamente uma entrada em uma nova tabela `lancamentos_financeiros`: id,
   agendamento_id (FK), barbeiro_id (copiado do agendamento, para permitir o filtro por
   sócio sem precisar fazer join toda vez), valor (copiado do `valor_cobrado` do
   agendamento — que por sua vez já foi copiado do serviço na Fase 2, mesma cadeia de
   cópia da regra 5 do documento de convenções), criado_em. Um agendamento só pode gerar
   um lançamento (não duplicar se o status for alternado entre `concluido` e outro estado
   e voltar — decida e documente o comportamento: ex. idempotência por `agendamento_id`
   único em `lancamentos_financeiros`, ou removendo o lançamento se o status sair de
   `concluido`).

4. **Dashboard financeiro** (protegido por login):
   - `GET /api/financeiro/resumo?de=&ate=&barbeiro_id=` — retorna total consolidado no
     período; se `barbeiro_id` for informado, filtra só aquele sócio. Sem `barbeiro_id`,
     retorna o consolidado dos dois (decisão de negócio da seção 2 do
     `planejamento-geral.md` — visão, não repartição).
   - `GET /api/financeiro/lancamentos?de=&ate=&barbeiro_id=` — lista os lançamentos do
     período, mesmo filtro opcional.

## Fora do escopo desta fase (não implementar ainda)

- Login de cliente, verificação de telefone (WhatsApp), página pública de agendamento,
  rate-limiting (regra 7) e opt-in (regra 9) — tudo isso é Fase 4.
- Qualquer repartição/cálculo automático de comissão entre sócios — decisão de negócio já
  fechada como "não existe" (ver seção 2 do `planejamento-geral.md`); não implemente isso
  nem como opção configurável.
- Frontend (`apps/web`).

## Entregáveis esperados

- Código completo seguindo a estrutura de pastas e nomenclatura do documento de
  convenções (novo módulo `clientes/` e `financeiro/`).
- Migração Drizzle com `clientes`, `lancamentos_financeiros`, e a alteração em
  `agendamentos` para aceitar `cliente_id` opcional (FK nullable).
- `README.md` atualizado: novas rotas, e a decisão documentada sobre o comportamento de
  lançamento financeiro quando o status de um agendamento concluído é revertido.
- Testar manualmente o fluxo: cadastrar cliente → criar agendamento vinculado a ele →
  concluir agendamento → conferir que o lançamento financeiro foi criado com o valor
  certo → conferir que o resumo consolidado e o filtro por sócio retornam os números
  certos.

## Critério de pronto

A Fase 3 está pronta quando: `clientes` existe como tabela própria (não reaproveitando
`usuarios`), agendamento pode opcionalmente vincular a um cliente cadastrado, concluir um
agendamento gera lançamento financeiro automaticamente com o valor correto e sem
duplicar, o dashboard retorna o consolidado e o filtro por sócio corretamente, e nenhuma
lógica de repartição automática entre sócios foi implementada.

import {
  boolean,
  integer,
  pgTable,
  serial,
  smallint,
  text,
  time,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * `usuarios` é exclusiva dos sócios/administradores do sistema (ver
 * 00-arquitetura-e-convencoes.md, seção "Decisão em aberto: usuarios genérico vs. tabela
 * própria para clientes"). Clientes finais ganham tabela própria na Fase 3 — nenhuma
 * coluna/lógica de cliente deve ser adicionada aqui.
 */
export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  telefone: text("telefone").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const barbeiros = pgTable("barbeiros", {
  id: serial("id").primaryKey(),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id)
    .unique(),
  ativo: boolean("ativo").notNull().default(true),
});

/**
 * Disponibilidade semanal recorrente de um barbeiro. `diaSemana` segue a convenção
 * 0 (domingo) a 6 (sábado), igual ao `Date.getDay()` do JavaScript, para evitar
 * conversão manual na camada de aplicação.
 */
export const disponibilidadeBarbeiro = pgTable("disponibilidade_barbeiro", {
  id: serial("id").primaryKey(),
  barbeiroId: integer("barbeiro_id")
    .notNull()
    .references(() => barbeiros.id),
  diaSemana: smallint("dia_semana").notNull(),
  horaInicio: time("hora_inicio").notNull(),
  horaFim: time("hora_fim").notNull(),
});

/**
 * `valor` é armazenado em centavos (inteiro), não em decimal/numeric: evita qualquer
 * ambiguidade de arredondamento de ponto flutuante em cálculo financeiro (essencial já
 * que a Fase 3 soma faturamento). A conversão para reais (÷100) fica só na camada de
 * apresentação.
 *
 * `ativo=false` é soft delete (nunca apagar de verdade — regra 5 do documento de
 * convenções): o valor/duração vigente no momento de um agendamento é copiado para
 * dentro do registro de `agendamento` na Fase 2, então desativar um serviço não afeta o
 * histórico já criado.
 */
export const servicos = pgTable("servicos", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  valorCentavos: integer("valor_centavos").notNull(),
  duracaoMinutos: integer("duracao_minutos").notNull(),
  ativo: boolean("ativo").notNull().default(true),
});

/**
 * Sessão persistida no banco (não um cookie assinado stateless): permite invalidar
 * sessões de verdade no logout e, se necessário no futuro, listar/revogar sessões ativas
 * de um usuário. O cookie carrega apenas o `id` (token opaco) desta tabela.
 */
export const sessoes = pgTable("sessoes", {
  id: text("id").primaryKey(),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
});

/**
 * Cliente final da barbearia — tabela própria, separada de `usuarios` (ver decisão
 * registrada em `00-arquitetura-e-convencoes.md`, seção "Decisão em aberto: usuarios
 * genérico vs. tabela própria para clientes": adotada a separação, justamente para não
 * misturar contas administrativas com contas de usuário final numa mesma tabela).
 * `telefoneVerificado` fica `false` até a Fase 4 implementar a verificação por WhatsApp
 * sob demanda — nesta fase o cadastro é feito pelo balcão/staff, presencial, sem canal
 * público ainda.
 *
 * `senhaHashPendente`/`nomePendente` (Fase 4, correção pós-auditoria — ver
 * `clientes-publico.service.ts`): quando o cadastro público (`POST
 * /api/publico/clientes/cadastro`) encontra um telefone já cadastrado pelo balcão, ele
 * NÃO sobrescreve `senhaHash`/`nome` na hora — quem chama essa rota só provou conhecer o
 * telefone, não posse dele. A senha/nome desejados ficam pendentes aqui até
 * `confirmarCodigoVerificacao` (verificacao.service.ts) confirmar, via código enviado por
 * WhatsApp pro telefone real, que quem está pedindo a troca é de fato o dono do telefone.
 * Só nesse momento os valores pendentes são aplicados e limpos. Isso fecha um sequestro
 * de conta: sem essa trava, qualquer um que soubesse o telefone de um cliente já
 * cadastrado conseguia trocar a senha dele e assumir a conta sem nenhuma verificação.
 */
export const clientes = pgTable("clientes", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  telefone: text("telefone").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  telefoneVerificado: boolean("telefone_verificado").notNull().default(false),
  senhaHashPendente: text("senha_hash_pendente"),
  nomePendente: text("nome_pendente"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * `inicio`/`fim` usam `timestamp` **sem** timezone (`mode: "string"`, sem
 * `withTimezone`), de propósito: a barbearia opera num único fuso (horário local), sem
 * agendamento entre fusos diferentes, e a exclusion constraint de referência da regra 8
 * do documento de convenções usa `tsrange` (que exige `timestamp without time zone` —
 * `tstzrange` seria o tipo certo para colunas `timestamptz`). Ficar em `mode: "string"`
 * evita qualquer conversão implícita de fuso pelo driver: a string recebida da API (ex.:
 * `"2026-09-15 10:00:00"`) é gravada e devolvida exatamente como está, sem passar por um
 * objeto `Date` do JavaScript (que sempre carrega noção de fuso). Ver
 * `agendamentos/data.util.ts` para a matemática de horário feita em cima dessas strings.
 *
 * `status`: `'confirmado' | 'cancelado' | 'concluido'` — validado também via `CHECK` na
 * migração (defesa em profundidade, igual ao padrão já usado no projeto). Cancelamento é
 * soft delete (regra 5): a linha nunca é apagada, só o `status` muda — quem de fato libera
 * o horário para reuso é a remoção da linha correspondente em `ocupacoes_barbeiro` (ver
 * abaixo), não a exclusion constraint direta nesta tabela.
 *
 * `valorCobradoCentavos`/`duracaoMinutos` (embutida no cálculo de `fim`) são copiados do
 * serviço no momento da criação, nunca referenciados ao vivo — mesma lógica da regra 5:
 * o serviço pode mudar de preço/duração depois sem afetar agendamentos já criados.
 */
export const agendamentos = pgTable("agendamentos", {
  id: serial("id").primaryKey(),
  barbeiroId: integer("barbeiro_id")
    .notNull()
    .references(() => barbeiros.id),
  servicoId: integer("servico_id")
    .notNull()
    .references(() => servicos.id),
  // Vínculo opcional com um cliente cadastrado (Fase 3) — não retroativo, não
  // obrigatório: um agendamento pode continuar sendo só um contato avulso
  // (`nomeCliente`/`telefoneCliente` preenchidos direto, sem `clienteId`). Quando
  // `clienteId` é informado na criação, nome/telefone são preenchidos a partir do
  // cadastro (ver `agendamentos.service.ts`), não digitados à mão.
  clienteId: integer("cliente_id").references(() => clientes.id),
  nomeCliente: text("nome_cliente").notNull(),
  telefoneCliente: text("telefone_cliente").notNull(),
  inicio: timestamp("inicio", { mode: "string" }).notNull(),
  fim: timestamp("fim", { mode: "string" }).notNull(),
  status: text("status").notNull().default("confirmado"),
  valorCobradoCentavos: integer("valor_cobrado_centavos").notNull(),
  // Opt-in explícito (regra 9 do documento de convenções), capturado no momento da
  // criação de CADA agendamento público — não é uma preferência global e permanente do
  // cliente em `clientes`. Decisão de modelagem (Fase 4): consentimento por agendamento,
  // não por conta, é a leitura mais segura de "não inferir consentimento implicitamente"
  // — um cliente pode querer confirmação automática de um agendamento específico e não
  // de outro, e fica claro no histórico exatamente para qual agendamento o consentimento
  // valeu. `default(false)` é proposital: sem o campo vir explicitamente `true` no corpo
  // da requisição (`publico.schema.ts` exige boolean, não aceita ausência como opt-in),
  // nunca dispara mensagem automática. Agendamentos criados pelo balcão (Fases 1-3, sem
  // `clienteId` ou por um sócio) sempre ficam `false` — regra 9 só vale pro canal
  // público, mas manter `false` como default cobre os dois casos com uma única coluna.
  aceitaMensagensAutomaticas: boolean("aceita_mensagens_automaticas").notNull().default(false),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Folga/feriado/bloqueio pontual da agenda de um barbeiro. Sem soft delete — ver README. */
export const bloqueiosAgenda = pgTable("bloqueios_agenda", {
  id: serial("id").primaryKey(),
  barbeiroId: integer("barbeiro_id")
    .notNull()
    .references(() => barbeiros.id),
  inicio: timestamp("inicio", { mode: "string" }).notNull(),
  fim: timestamp("fim", { mode: "string" }).notNull(),
  motivo: text("motivo"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Tabela estreita, dedicada só a garantir "este barbeiro não pode estar em dois lugares
 * ao mesmo tempo" — decisão de modelagem registrada no README (seção "Trava de conflito:
 * agendamento vs. bloqueio"). Em vez de unificar `agendamentos` e `bloqueios_agenda` numa
 * tabela só (o que encheria as duas de colunas nulas específicas da outra), cada
 * agendamento/bloqueio ganha, na mesma transação em que é criado, uma linha espelho aqui
 * — e é **só sobre esta tabela** que vive a exclusion constraint (`ocupacoes_barbeiro_
 * sem_sobreposicao`, ver migração). Isso cobre as 3 combinações de conflito possíveis
 * (agendamento×agendamento, agendamento×bloqueio, bloqueio×bloqueio) com uma única
 * constraint no banco — não só na aplicação, cumprindo a regra 8 do documento de
 * convenções mesmo no caso (agendamento×bloqueio) que fica fora do escopo literal da
 * regra 8 original (ela cobria só agendamento×agendamento).
 *
 * Cancelar um agendamento ou remover um bloqueio apaga a linha correspondente aqui
 * (dentro da mesma transação) — é isso que libera o horário para reuso, não um `WHERE`
 * parcial na constraint.
 */
export const ocupacoesBarbeiro = pgTable("ocupacoes_barbeiro", {
  id: serial("id").primaryKey(),
  barbeiroId: integer("barbeiro_id")
    .notNull()
    .references(() => barbeiros.id),
  inicio: timestamp("inicio", { mode: "string" }).notNull(),
  fim: timestamp("fim", { mode: "string" }).notNull(),
  // 'agendamento' | 'bloqueio' — exatamente um dos dois ids abaixo deve estar preenchido
  // (CHECK na migração garante a consistência).
  tipo: text("tipo").notNull(),
  agendamentoId: integer("agendamento_id").references(() => agendamentos.id),
  bloqueioId: integer("bloqueio_id").references(() => bloqueiosAgenda.id),
});

/**
 * Um lançamento por agendamento concluído, no máximo — `agendamentoId` é `unique()` de
 * propósito: é essa constraint (não uma checagem na aplicação) que garante que alternar
 * o status de um agendamento entre `concluido` e outro estado várias vezes nunca duplica
 * o lançamento (ver `financeiro.service.ts`, que faz `INSERT ... ON CONFLICT DO NOTHING`
 * nesse índice). `barbeiroId` e `valorCentavos` são copiados do agendamento no momento da
 * conclusão — mesma lógica de cópia da regra 5 do documento de convenções — para permitir
 * o filtro/soma por sócio sem precisar de join a cada consulta do dashboard.
 *
 * Decisão de comportamento (pedida explicitamente pelo escopo da Fase 3): se o status de
 * um agendamento concluído for revertido para qualquer outro valor, o lançamento
 * correspondente é **removido** (não fica um lançamento "órfão" referenciando um
 * agendamento que não está mais concluído) — ver `agendamentos.service.ts`. Se depois for
 * concluído de novo, um novo lançamento é criado. Isso mantém `lancamentos_financeiros`
 * sempre consistente com "agendamentos com status = concluido agora", sem histórico de
 * lançamentos revertidos — decisão documentada também no README.
 */
export const lancamentosFinanceiros = pgTable("lancamentos_financeiros", {
  id: serial("id").primaryKey(),
  agendamentoId: integer("agendamento_id")
    .notNull()
    .references(() => agendamentos.id)
    .unique(),
  barbeiroId: integer("barbeiro_id")
    .notNull()
    .references(() => barbeiros.id),
  valorCentavos: integer("valor_centavos").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Sessão de **cliente** — tabela própria, deliberadamente separada de `sessoes` (que é
 * só de sócio/usuário administrativo). Reaproveitar a mesma tabela misturaria dois
 * contextos de autorização completamente diferentes (acesso administrativo total vs.
 * acesso restrito ao próprio histórico) atrás de um único nome de coluna/cookie — mesmo
 * raciocínio já registrado em `00-arquitetura-e-convencoes.md` para a separação
 * `usuarios`/`clientes`. Ver `shared/sessao/sessao-cliente.util.ts`.
 */
export const sessoesCliente = pgTable("sessoes_cliente", {
  id: text("id").primaryKey(),
  clienteId: integer("cliente_id")
    .notNull()
    .references(() => clientes.id),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
});

/**
 * Código de verificação de telefone por WhatsApp (regra 7 do documento de convenções —
 * rate-limiting obrigatório). Cada linha é **uma tentativa de envio**, não um "código
 * atual" substituído — é a contagem de linhas recentes por `clienteId`/`ip` que
 * implementa o limite (ver `verificacao.service.ts`), não um contador separado. Guardar
 * o histórico completo de tentativas (mesmo expiradas/erradas) também ajuda a auditar
 * abuso depois.
 *
 * `codigoHash` — nunca o código em texto puro (mesmo raciocínio da regra 1 para senha:
 * o valor não precisa estar em texto puro em lugar nenhum para ser útil, e reduz o dano
 * de um vazamento de banco). Hash simples (SHA-256, ver `verificacao.util.ts`) é
 * suficiente aqui — diferente de senha, o código é numérico curto, de uso único e expira
 * em minutos; o custo de um PBKDF2 com milhares de iterações não compra proteção real
 * adicional nesse cenário (o rate-limiting da regra 7 é a defesa real contra
 * força-bruta, não o custo do hash).
 */
export const codigosVerificacao = pgTable("codigos_verificacao", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id")
    .notNull()
    .references(() => clientes.id),
  ip: text("ip").notNull(),
  codigoHash: text("codigo_hash").notNull(),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
  usadoEm: timestamp("usado_em", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Registro de tentativas de login/cadastro — defesa genérica de força-bruta/abuso
 * (correção pós-auditoria, ver `07-auditoria-geral-backend.md`), mesmo raciocínio da
 * regra 7 (limite por identificador + limite complementar por IP), reaproveitado para
 * três contextos que não tinham nenhum rate-limiting: login de sócio, login de cliente e
 * cadastro público (que, sem limite, permitia a qualquer um forçar
 * `clientes.telefone_verificado` de volta para `false` repetidamente — ver
 * `shared/rate-limit/rate-limite.util.ts`). Cada linha é uma tentativa (sucesso ou
 * falha) — contar a tentativa em si, não só falhas, é o que impede um atacante de
 * "gastar" tentativas de graça só porque acertou ou errou a credencial.
 */
export const tentativasAcesso = pgTable("tentativas_acesso", {
  id: serial("id").primaryKey(),
  // 'login_socio' | 'login_cliente' | 'cadastro_publico' — validado também via CHECK.
  contexto: text("contexto").notNull(),
  // Telefone envolvido na tentativa (quem está tentando logar, ou o telefone-alvo do
  // cadastro) — mesmo campo usado como identificador nos dois contextos.
  identificador: text("identificador").notNull(),
  ip: text("ip").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

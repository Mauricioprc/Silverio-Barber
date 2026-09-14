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
  nomeCliente: text("nome_cliente").notNull(),
  telefoneCliente: text("telefone_cliente").notNull(),
  inicio: timestamp("inicio", { mode: "string" }).notNull(),
  fim: timestamp("fim", { mode: "string" }).notNull(),
  status: text("status").notNull().default("confirmado"),
  valorCobradoCentavos: integer("valor_cobrado_centavos").notNull(),
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

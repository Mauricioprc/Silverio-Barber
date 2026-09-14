import {
  boolean,
  integer,
  pgTable,
  serial,
  smallint,
  text,
  time,
  timestamp,
  unique,
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
 * A partir do 3º sócio, `registrar-socio` não funciona mais direto (ver
 * `auth.service.ts`): um sócio logado propõe um novo sócio aqui, e a conta só é
 * criada em `usuarios`/`barbeiros` quando todos os sócios ativos tiverem aprovado
 * (registrado em `aprovacoes_socio`). `senhaHash` é gerada no momento da solicitação —
 * nunca senha em texto puro, mesmo pendente de aprovação (regra 1 do documento de
 * convenções também vale aqui).
 */
export const solicitacoesSocio = pgTable("solicitacoes_socio", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  telefone: text("telefone").notNull(),
  senhaHash: text("senha_hash").notNull(),
  solicitadoPor: integer("solicitado_por")
    .notNull()
    .references(() => usuarios.id),
  // 'pendente' | 'aprovada' | 'rejeitada'
  status: text("status").notNull().default("pendente"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  resolvidaEm: timestamp("resolvida_em", { withTimezone: true }),
});

/** Um voto de aprovação de um sócio ativo para uma `solicitacao_socio`. */
export const aprovacoesSocio = pgTable(
  "aprovacoes_socio",
  {
    id: serial("id").primaryKey(),
    solicitacaoId: integer("solicitacao_id")
      .notNull()
      .references(() => solicitacoesSocio.id),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    aprovadoEm: timestamp("aprovado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabela) => [unique().on(tabela.solicitacaoId, tabela.usuarioId)]
);

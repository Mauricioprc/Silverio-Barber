# Prompt — Fase 1: Fundação (Silvério Barbearia)


Ponto de partida: não existe nenhum código anterior a aproveitar ou migrar — o
repositório está vazio. Comece o projeto do zero seguindo exatamente a estrutura de
pastas do documento de convenções.

## Contexto do negócio

Sistema de gestão para uma barbearia com 2 sócios-barbeiros (não há modelo de
comissão/funcionário — os 2 são donos, o faturamento é mostrado consolidado com filtro
por sócio, sem repartição automática). Volume estimado: mais de 1000 agendamentos/mês
somando os dois. Esta é a Fase 1 de um projeto em 5 fases; construa apenas o escopo
descrito abaixo, sem antecipar funcionalidade das fases seguintes.

## Escopo desta fase

1. Setup do projeto seguindo exatamente a estrutura de pastas e as convenções do
   documento `00-arquitetura-e-convencoes.md` (monorepo, `apps/api`, Hono + Drizzle +
   Neon + Zod, tudo em Cloudflare Workers).
2. Schema do banco (Drizzle, Postgres/Neon) com as tabelas:
   - `usuarios`: id, nome, telefone (único), senha_hash, criado_em. **Esta tabela é
     exclusiva dos sócios/administradores do sistema** — não é uma tabela de identidade
     genérica compartilhada com clientes. Ver decisão registrada no documento de
     convenções ("Decisão em aberto: `usuarios` genérico vs. tabela própria para
     clientes"): a recomendação adotada é isolar cliente numa tabela própria na Fase 3
     (`clientes`), justamente para não misturar contas administrativas com contas de
     usuário final numa mesma tabela. Não crie nenhuma coluna, `tipo`/`role` ou lógica
     pensando em cliente nesta fase — isso é escopo da Fase 3.
   - `barbeiros`: id, usuario_id (FK), ativo (boolean, default true).
   - `disponibilidade_barbeiro`: id, barbeiro_id (FK), dia_semana (0-6), hora_inicio,
     hora_fim.
   - `servicos`: id, nome, descricao, valor (numeric, em centavos ou decimal — decida e
     documente a escolha), duracao_minutos, ativo (boolean, default true, nunca apagar de
     verdade — ver regra 5 do documento de convenções).
3. Autenticação dos sócios:
   - `POST /api/auth/registrar-socio` — cria usuário + registro de barbeiro. **Rota de
     bootstrap único**: deve verificar se já existe algum registro em `usuarios` antes de
     executar, e recusar com erro (403) se a tabela não estiver vazia. Isso impede que a
     rota vire uma porta aberta de criação de conta com acesso total caso o deploy fique
     no ar antes de alguém lembrar de removê-la ou protegê-la — não depender de disciplina
     operacional pra isso, o código tem que impedir sozinho. Como `usuarios` passa a ser
     exclusiva de sócios (ver item 2), essa checagem continua válida para sempre: depois
     do bootstrap inicial, a tabela nunca mais deveria crescer por essa rota. Documentar
     claramente esse comportamento no README (ver seção de entregáveis).
   - `POST /api/auth/login` — autentica por telefone + senha, devolve cookie de sessão.
   - `POST /api/auth/logout` — encerra a sessão.
   - Sessão persistente de 30 dias (ver regras 2 e 3 do documento de convenções).
4. CRUD de serviços (protegido por login):
   - Listar (com filtro opcional `?ativos=1`), criar, editar, desativar (soft delete).
5. Cadastro de barbeiros/disponibilidade (protegido por login):
   - Listar barbeiros.
   - Ler/substituir a disponibilidade semanal de um barbeiro (dias e horários de
     trabalho).
   - Ativar/desativar um barbeiro.

## Fora do escopo desta fase (não implementar ainda)

- Agendamentos e trava de conflito de horário, incluindo a exclusion constraint da regra
  8 do documento de convenções — precisa da extensão `btree_gist` e da tabela
  `agendamentos`, nenhuma das duas existe ainda (Fase 2).
- Cadastro/login de clientes finais, incluindo a tabela `clientes` (Fase 3/4).
- Qualquer integração com WhatsApp, SMS ou e-mail (Fase 4) — inclusive o rate-limiting de
  reenvio de código (regra 7) e o consentimento de opt-in (regra 9) do documento de
  convenções, que só se aplicam quando essa integração existir.
- Frontend (`apps/web`) — esta fase é só a API.

## Entregáveis esperados

- Código completo em `apps/api` seguindo a estrutura de pastas do documento de
  convenções, com nomes de módulo/arquivo em português coerentes com o domínio.
- Migração Drizzle gerada e versionada.
- `README.md` do projeto explicando:
  - como rodar localmente (incluindo apontar para um banco Neon de desenvolvimento ou
    instância local de Postgres);
  - variáveis de ambiente necessárias (string de conexão Neon, segredo de sessão);
  - lista de rotas prontas com método/autenticação/descrição;
  - o comportamento de bootstrap único de `registrar-socio` (o que fazer se precisar
    recriar os sócios do zero em um ambiente já usado — ex.: apagar as linhas
    correspondentes ou resetar o banco de dev, nunca "reabrir" a rota em produção);
  - checklist do que fazer antes de ir para produção: criar projeto Neon real (sem cartão
    de crédito, plano free — 100 CU-horas/mês e 0,5 GB de armazenamento, ver documento de
    convenções), gerar segredo de sessão real, aplicar migração no banco real, cadastrar
    os 2 sócios via `registrar-socio` **antes** de qualquer outra pessoa conseguir acessar
    a URL pública, e **usar roteamento por caminho único sob o mesmo domínio**
    (`dominio.com.br/api/*` pro Worker, resto pro Pages) em vez de subdomínios separados
    para front e API — ver a nota operacional sobre cookies no documento de convenções
    para o motivo técnico; sem isso o login pode não funcionar em produção.
- Testar manualmente (ou com script) o fluxo completo: registrar sócio → login → criar
  serviço → editar disponibilidade → logout, confirmando que rotas protegidas exigem
  sessão válida e que uma segunda chamada a `registrar-socio` é recusada.

## Critério de pronto

A Fase 1 está pronta quando: o schema está migrado, os 2 sócios conseguem ser
cadastrados (e uma tentativa de registrar um terceiro/quarto usuário via
`registrar-socio` é corretamente recusada) e logados, o CRUD de serviços funciona com
soft delete, a disponibilidade de cada barbeiro pode ser lida e substituída, e todas as
regras não-negociáveis aplicáveis a esta fase do documento de convenções estão aplicadas
(hashing de senha, cookie de sessão, mensagem de erro genérica no login, validação Zod em
toda rota, soft delete de serviço).
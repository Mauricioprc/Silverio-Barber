# Arquitetura e Convenções — Sistema Silvério Barbearia

Atualizado em 14/09/2026, com verificação técnica na internet (fontes citadas onde
relevante). Este documento define a base técnica que todo prompt de construção
(Fase 1, 2, 3...) deve seguir. Cole este documento junto com o prompt de cada fase ao
usar o Claude Code, ou referencie-o se o Claude Code já tiver acesso ao repositório com
este arquivo salvo nele.

## Stack definida

- **Hospedagem**: Cloudflare Pages (frontend estático) + Cloudflare Workers (API/backend).
  Gratuito nos dois, sem restrição de uso comercial.
- **Banco de dados**: Neon Postgres, plano free. Verificado na documentação oficial: sem
  cartão de crédito para criar conta, 100 CU-horas de computação/mês, 0,5 GB de
  armazenamento por projeto, autosuspend obrigatório após 5 minutos de inatividade (não
  pode ser desativado no free) — ao esgotar as CU-horas do mês, o compute fica suspenso
  até o próximo ciclo ou upgrade, com conexões existentes derrubadas. Nenhuma restrição de
  uso comercial encontrada na documentação. Acessado a partir do Worker via driver
  HTTP/serverless da Neon (`@neondatabase/serverless`) — não precisa de conexão TCP
  persistente, funciona bem no ambiente de Workers.
  Fonte: [Neon plans](https://neon.com/docs/introduction/plans), [Neon free plan limits FAQ](https://neon.com/faqs/free-plan-limits-and-quotas).
- **ORM**: Drizzle ORM. Escolhido por ser leve, type-safe, gerar SQL previsível e ter
  suporte de primeira classe a Cloudflare Workers + Neon. Não usar Prisma (não roda bem em
  Workers sem camadas extras).
- **Validação de entrada**: Zod, em todas as rotas que recebem dados do cliente.
- **Framework HTTP**: Hono (roteamento, middlewares, cookies).
- **Motivo da troca de D1 (SQLite) para Postgres**: o SQLite do D1 não tem suporte a
  *exclusion constraints*, que são a forma correta de impedir dois agendamentos
  conflitantes no banco (não só na aplicação). Postgres tem isso nativamente via
  `EXCLUDE USING gist`, e essa é a regra de negócio mais crítica do sistema (Fase 2). Ver
  regra 8 abaixo — isso não fica só como justificativa de escolha de banco, é regra
  obrigatória de implementação, incluindo o pré-requisito técnico que ela exige (extensão
  `btree_gist` — ver regra 8).

## Pontos a monitorar (não bloqueiam o início, mas exigem acompanhamento)

- **Teto de CU-horas do plano free da Neon (100/mês)**: com autosuspend ativo isso não é
  problema no início (o compute "dorme" fora do horário de uso e acorda em cerca de 1
  segundo na próxima consulta). Mas com 2 barbeiros e agenda cheia o uso "acordado" durante
  o expediente pode se aproximar do teto conforme o volume de acesso simultâneo crescer —
  checagem explícita na Fase 5 (ver seção de fases no `planejamento-geral.md`).
- **Extensão `btree_gist` em produção**: confirmado no changelog de extensões da Neon que
  `btree_gist` está disponível em todas as versões de Postgres suportadas (14 a 18), sem
  restrição de plano listada na documentação. Ainda assim, antes do deploy real da Fase 2,
  confirmar no projeto Neon de produção específico que a extensão ativa sem erro
  (`CREATE EXTENSION IF NOT EXISTS btree_gist;`) — extensões podem, em casos raros, exigir
  reinício do compute para ficarem disponíveis.
  Fonte: [The btree_gist extension — Neon Docs](https://neon.com/docs/extensions/btree_gist).

## Convenção de pastas e arquivos

Cada prompt de fase deve gerar/editar arquivos seguindo esta estrutura (mono-repo):

```
silverio-sistema/
├── apps/
│   ├── api/                        # Worker (backend)
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── schema.ts       # Definição das tabelas (Drizzle)
│   │   │   │   ├── client.ts       # Criação da conexão Neon+Drizzle
│   │   │   │   └── migrations/     # Migrações geradas pelo drizzle-kit
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.routes.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── auth.schema.ts   # Zod schemas desse módulo
│   │   │   │   │   └── senha.util.ts    # hash/verificação de senha
│   │   │   │   ├── servicos/
│   │   │   │   │   ├── servicos.routes.ts
│   │   │   │   │   ├── servicos.service.ts
│   │   │   │   │   └── servicos.schema.ts
│   │   │   │   └── barbeiros/
│   │   │   │       ├── barbeiros.routes.ts
│   │   │   │       ├── barbeiros.service.ts
│   │   │   │       └── barbeiros.schema.ts
│   │   │   ├── shared/
│   │   │   │   ├── middleware/
│   │   │   │   │   └── exigir-login.ts
│   │   │   │   ├── sessao/
│   │   │   │   │   └── sessao.util.ts
│   │   │   │   └── tipos.ts        # Env, Variables compartilhados
│   │   │   └── index.ts            # monta o app Hono e as rotas
│   │   ├── wrangler.toml
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                        # frontend (fases seguintes)
├── package.json                    # workspace raiz (npm workspaces)
└── README.md
```

Regra de nomenclatura: nome do arquivo/pasta em português, coerente com o domínio do
negócio (igual ao que já vínhamos usando: `servicos`, `barbeiros`, `agendamentos`), cada
módulo de negócio isolado em sua própria pasta com rotas/serviço/validação separados (não
misturar tudo em um arquivo de rotas gigante). Nada de nomes genéricos tipo `utils.ts`
solto na raiz — cada util fica dentro do módulo que o usa, a menos que seja usado por mais
de um módulo (aí vai em `shared/`).

## Decisão em aberto: `usuarios` genérico vs. tabela própria para clientes

A Fase 1 cria `usuarios` como identidade genérica (sócio = usuário + registro em
`barbeiros`). Fica em aberto se a Fase 3 (cadastro de cliente) reaproveita `usuarios` ou
cria uma tabela própria (`clientes`). Registrando aqui o trade-off, para quem decidir na
Fase 3 não perder o contexto:

- **Reaproveitar `usuarios`** (com uma coluna `tipo`/`role`: `socio` ou `cliente`):
  menos duplicação de campos comuns (nome, telefone, senha_hash), mas mistura num mesmo
  lugar 2 contas fixas com acesso administrativo total e, potencialmente, milhares de
  contas de cliente com acesso restrito só ao próprio histórico — risco real de bug de
  autorização se alguma rota esquecer de filtrar por `tipo`/dono do recurso.
- **Tabela `clientes` separada**: isola completamente a superfície de permissão (nenhuma
  query de sócio pode acidentalmente pegar dado de cliente ou vice-versa, porque são
  tabelas diferentes), ao custo de duplicar login/senha/telefone em dois lugares.
- **Recomendação**: tabela separada. Sistemas com poucos administradores e muitos usuários
  finais de perfil de acesso muito diferente (que é exatamente este caso: 2 sócios com
  acesso total vs. clientes com acesso ao próprio agendamento) normalmente saem ganhando
  em segurança ao separar, mesmo com alguma duplicação de schema. A Fase 3 pode reavaliar
  se, na prática, a duplicação se mostrar mais custosa que o ganho de isolamento — mas
  deve justificar explicitamente se decidir pelo reaproveitamento.

## Regras não-negociáveis (repetir em todo prompt de fase)

1. Senha nunca em texto puro — hash com PBKDF2 (Web Crypto nativo do Worker) ou, se o
   ambiente permitir, `bcrypt`/`argon2` via lib compatível com Workers — decisão técnica
   fica a critério do Claude Code, mas hashing forte é obrigatório.
2. Sessão via cookie assinado (`httpOnly`, `Secure`, `SameSite=Strict`), 30 dias, sem
   exigir senha novamente dentro desse período.
3. Erro de login não deve diferenciar "usuário não existe" de "senha errada".
4. Todo dado de entrada validado no servidor via Zod antes de tocar o banco.
5. `servicos` nunca são apagados de verdade — soft delete (`ativo = false`) — porque o
   valor/duração do serviço precisa ser copiado para dentro do registro de `agendamento`
   no momento da criação (não referenciado ao vivo), preservando o histórico financeiro
   mesmo que o serviço mude de preço depois.
6. Toda migração de banco deve ser gerada via `drizzle-kit` e versionada em
   `apps/api/src/db/migrations/`.
7. **Rate-limiting no envio/reenvio de código de verificação (WhatsApp), obrigatório desde
   a Fase 4**: cada envio custa dinheiro de verdade (tarifa Meta por mensagem). Sem
   limite, um endpoint público de "reenviar código" é uma porta aberta pra sangria de
   orçamento (spam, ataque, ou só um usuário clicando "reenviar" repetidamente). Limite
   mínimo: no máximo 3 envios por telefone a cada 15 minutos, com backoff crescente entre
   tentativas, e limite complementar por IP para dificultar abuso via telefones diferentes
   a partir da mesma origem.
8. **Trava de conflito de horário via constraint no banco, não só na aplicação, obrigatória
   a partir da Fase 2**: a tabela `agendamentos` deve ter uma exclusion constraint
   impedindo sobreposição de intervalo de horário para o mesmo barbeiro. Padrão verificado
   e correto (SQL de referência — a Fase 2 detalha os nomes reais de tabela/coluna):
   ```sql
   CREATE EXTENSION IF NOT EXISTS btree_gist;

   ALTER TABLE agendamentos ADD CONSTRAINT agendamentos_horario_valido
     CHECK (fim > inicio);

   ALTER TABLE agendamentos ADD CONSTRAINT agendamentos_sem_sobreposicao
     EXCLUDE USING gist (
       barbeiro_id WITH =,
       tsrange(inicio, fim) WITH &&
     ) WHERE (status <> 'cancelado');
   ```
   A constraint `agendamentos_horario_valido` (`CHECK (fim > inicio)`) é um complemento
   obrigatório, não opcional: a exclusion constraint acima impede sobreposição entre
   agendamentos, mas sozinha não impede um agendamento com horário invertido ou de
   duração zero (`fim <= inicio`) — esse caso não é sobreposição com nada, então passaria
   despercebido sem o `CHECK` explícito.
   A extensão `btree_gist` é **pré-requisito obrigatório**: sem ela, uma exclusion
   constraint que combina uma coluna de igualdade (`barbeiro_id`) com uma de intervalo
   (`tsrange`) não pode ser criada, porque o operador de igualdade padrão não pertence à
   classe de operadores do GiST — só passa a existir quando a extensão é habilitada. A
   migração da Fase 2 deve incluir `CREATE EXTENSION IF NOT EXISTS btree_gist;` como
   primeiro passo. A cláusula `WHERE (status <> 'cancelado')` é intencional: agendamentos
   cancelados não devem contar como conflito, mas continuam no histórico (não excluir
   fisicamente, mesma lógica de soft delete da regra 5). Verificação na camada de
   aplicação continua valendo como reforço, só para dar mensagem de erro amigável ao
   usuário antes de bater no banco — nunca substitui a constraint.
   Fontes: [The btree_gist extension — Neon Docs](https://neon.com/docs/extensions/btree_gist), [PostgreSQL's GiST Exclusion Constraint — Amit Avraham](https://amitavroy.com/articles/postgresql-gist-exclusion-constraintthe-database-evel-answer-to-double-bookings).
9. **Expansão do quadro de sócios exige aprovação coletiva, a partir da Fase 1**: os 2
   sócios iniciais são criados livremente via bootstrap (`registrar-socio`, que se fecha
   sozinho ao atingir 2 registros em `usuarios`). Depois disso, adicionar um novo sócio
   (3º, 4º...) não pode depender da vontade de um único sócio logado — precisa de
   aprovação de **todos** os sócios ativos no momento, cada um autenticado na própria
   sessão, antes da conta ser criada. Motivo: sócio tem acesso administrativo total ao
   sistema (dado financeiro, dado de cliente nas fases seguintes); permitir que um único
   sócio crie outro administrador sozinho é uma porta de escalonamento de privilégio sem
   controle. Ver `01a-fase1-correcoes.md` para o desenho de referência (tabelas
   `solicitacoes_socio`/`aprovacoes_socio`, rotas `/api/auth/solicitacoes-socio/*`).
10. Consentimento explícito (opt-in) para mensagens automáticas via WhatsApp, obrigatório
   desde a Fase 4: o cadastro/fluxo de agendamento online do cliente deve incluir uma
   confirmação explícita (checkbox não pré-marcado) de que ele aceita receber mensagem de
   confirmação/lembrete automático. Não inferir consentimento implicitamente só por o
   cliente ter fornecido o telefone — é exigência da própria política de mensagens de
   template da Meta, além de ser a prática correta.

## Nota operacional: domínio e cookie entre front e API

Cloudflare Pages (`*.pages.dev`) e Cloudflare Workers (`*.workers.dev`) são domínios-base
(eTLD+1) diferentes por padrão — cookie `SameSite=Strict` não seria enviado entre eles.

Verificação técnica adicional (14/09/2026): mesmo depois de colocar front e API sob o
mesmo domínio-base, usando subdomínios (ex.: `app.silveriobarbearia.com.br` e
`api.silveriobarbearia.com.br`), isso **sozinho não basta**. Requisições entre subdomínios
do mesmo domínio-base são consideradas "same-site" e por isso não são bloqueadas por
`SameSite=Strict` — mas um cookie sem o atributo `Domain` definido explicitamente é
*host-only*: fica restrito exatamente ao host onde foi setado (`api.silveriobarbearia.com.br`)
e não é enviado para `app.silveriobarbearia.com.br` mesmo sendo o mesmo domínio-base. Para
funcionar com subdomínios seria necessário setar `Domain=.silveriobarbearia.com.br`
explicitamente no cookie.

**Recomendação (evita esse problema por completo)**: usar roteamento de caminho único sob
o mesmo domínio — `silveriobarbearia.com.br/api/*` apontando para o Worker e o restante
para o Pages — em vez de subdomínios separados. Nesse desenho, front e API são o mesmo
origin do ponto de vista do navegador, o cookie funciona com as configurações padrão
(sem precisar do atributo `Domain` explícito) e não há necessidade de raciocinar sobre
same-site vs. cross-site. Só usar subdomínios separados se houver um motivo técnico
concreto pra isso, e nesse caso o `Domain` explícito do cookie é obrigatório, não
opcional. Desenvolvimento local via proxy same-origin (Wrangler dev) não é afetado — o
problema só aparece no primeiro deploy público com login. Ver checklist de pré-produção
no prompt de cada fase que envolva deploy.
Fontes: [SameSite cookies explained — web.dev](https://web.dev/articles/samesite-cookies-explained), [MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie).

## Como usar os prompts de fase

Cada prompt de fase (`01-fase1-fundacao.md`, `02-fase2-agenda.md`, ...) é auto-contido:
pode ser colado direto no Claude Code. Ele deve sempre ler este documento primeiro (ou
recebê-lo colado antes) para saber a arquitetura e as convenções antes de gerar código.
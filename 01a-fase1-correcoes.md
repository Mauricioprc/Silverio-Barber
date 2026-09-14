# Prompt — Correções pós-auditoria da Fase 1 (Silvério Barbearia)

Este prompt corrige problemas encontrados numa auditoria independente do código já gerado
para a Fase 1 (`apps/api`) e adiciona uma regra de negócio nova para expansão do quadro de
sócios. Leia `00-arquitetura-e-convencoes.md` antes de aplicar qualquer mudança — as
correções abaixo devem continuar respeitando todas as regras não-negociáveis já
definidas lá.

## 1. Bootstrap de sócios: aceitar os 2 iniciais, depois exigir aprovação dos sócios existentes

**Problema encontrado**: `registrarSocio` (`auth.service.ts`) recusa a rota assim que
existir **qualquer** registro em `usuarios`, bloqueando o cadastro do 2º sócio. Isso
contradiz o critério de pronto da Fase 1, que exige que os 2 sócios consigam se cadastrar
e só a partir do 3º a rota seja recusada.

**Correção + regra de negócio nova**, nesta ordem de prioridade:

1. `POST /api/auth/registrar-socio` deve aceitar o cadastro **enquanto houver menos de 2
   sócios** em `usuarios` (ou seja, os 2 primeiros cadastros passam livremente, sem
   exigir aprovação de ninguém — é o bootstrap inicial do sistema).
2. A partir do momento em que já existem 2 sócios cadastrados, `registrar-socio` direto
   deixa de funcionar (mantém o 403 de hoje), mas passa a existir um fluxo alternativo
   para adicionar um novo sócio (3º, 4º, ...) que **exige aprovação de todos os sócios
   ativos existentes**, autenticados individualmente (login de cada um), antes de criar a
   conta:
   - `POST /api/auth/solicitacoes-socio` (protegida por login): um sócio logado propõe um
     novo sócio, enviando `nome`, `telefone`, `senha` do candidato. Cria um registro de
     solicitação pendente. O sócio que solicitou conta automaticamente como tendo
     aprovado (não precisa aprovar a própria solicitação de novo).
   - `GET /api/auth/solicitacoes-socio` (protegida por login): lista solicitações
     pendentes, com quem já aprovou.
   - `POST /api/auth/solicitacoes-socio/:id/aprovar` (protegida por login): registra a
     aprovação do sócio logado. Um sócio não pode aprovar duas vezes a mesma solicitação
     (idempotente ou erro claro). Quando **todos os sócios ativos** (todos os registros de
     `barbeiros` com `ativo = true`, exceto o solicitante, que já aprovou automaticamente)
     tiverem aprovado, a solicitação muda para `aprovada` e o novo usuário + barbeiro é
     criado nesse momento (não antes).
   - `POST /api/auth/solicitacoes-socio/:id/rejeitar` (protegida por login): qualquer
     sócio ativo pode rejeitar; rejeição de um só já encerra a solicitação como
     `rejeitada` (não precisa unanimidade para rejeitar, só para aprovar).
   - Modele isso com tabelas próprias (`solicitacoes_socio` e `aprovacoes_socio`, nomes
     em português coerentes com o domínio, seguindo a convenção de pastas — tudo dentro
     do módulo `auth`, já que é parte do fluxo de conta de sócio). Não reaproveite a
     tabela `usuarios` para guardar estado de solicitação pendente — sócio só existe em
     `usuarios` depois de aprovado.
   - A senha do candidato deve ser hasheada (mesma função de `senha.util.ts`) no momento
     da solicitação, não em texto puro, mesmo estando pendente de aprovação — vale a regra
     1 do documento de convenções também para dados ainda não confirmados.
   - Validação Zod em todas essas rotas nomeadas acima, igual às demais.
3. Atualize o `README.md` (seção de rotas prontas e a seção de comportamento de
   bootstrap) para descrever esse fluxo de duas camadas: bootstrap livre para os 2
   primeiros, aprovação multi-sócio a partir do 3º.
4. Atualize `00-arquitetura-e-convencoes.md`: adicione este comportamento (aprovação
   coletiva dos sócios ativos para expandir o quadro societário) como uma regra
   registrada, já que se repete em qualquer fase futura que mexa em `usuarios`/`barbeiros`
   — inclua uma nota curta na seção de convenções ou na tabela de decisões, para não se
   perder quando alguém reler o documento sem o histórico desta correção.

## 2. Scripts de migração não carregam `.dev.vars`

**Problema encontrado**: `apps/api/src/db/migrar.ts` e `apps/api/drizzle.config.ts` usam
`import "dotenv/config"`, que só lê `.env` por padrão — nunca `.dev.vars`, que é o arquivo
que o próprio `README.md` manda criar. Reproduzido na prática: criar só `.dev.vars` e
rodar `npm run db:migrate` ou `npx drizzle-kit generate` falha com "DATABASE_URL não
definida", mesmo seguindo o README à risca.

**Correção**: apontar o `dotenv` explicitamente para `.dev.vars` nos dois arquivos (ex.:
`import { config } from "dotenv"; config({ path: ".dev.vars" });`), mantendo compatível
com quem eventualmente também tiver um `.env`. Ajustar o README se o comportamento final
mudar.

## 3. Cookie de sessão não é assinado, apesar da regra 2 do documento de convenções

**Problema encontrado**: a regra 2 do documento de convenções exige "cookie assinado". A
implementação atual usa um token opaco aleatório validado contra a tabela `sessoes` no
banco (o que dá uma garantia equivalente de não-forjabilidade), mas não assina o cookie
com `SESSAO_SECRETO` — o próprio `README.md` documenta isso como pendência ("reservado
para uso futuro").

**Correção**: usar `setSignedCookie`/`getSignedCookie` de `hono/cookie` com
`c.env.SESSAO_SECRETO` para assinar o cookie de sessão, em vez de `setCookie`/`getCookie`
simples. Isso fecha a regra 2 ao pé da letra sem trocar o desenho de sessão persistida no
banco (mantém os dois: token opaco validado no banco **e** cookie assinado — defesa em
profundidade, não escolha exclusiva). Atualizar o README para remover a nota de "não
usado nesta fase".

## Critério de pronto desta correção

- Uma segunda chamada a `registrar-socio` com a tabela `usuarios` tendo 1 registro
  funciona e cria o 2º sócio.
- Uma terceira chamada a `registrar-socio` é recusada com 403.
- Com 2 sócios logados em sessões separadas, o fluxo de solicitação → aprovação cria um
  3º sócio somente depois que ambos aprovarem; uma solicitação com só 1 aprovação não cria
  conta nenhuma.
- `npm run db:migrate` funciona só com `.dev.vars` preenchido, sem precisar criar `.env`
  também.
- O cookie de sessão devolvido por `/api/auth/login` é assinado (validável via
  `getSignedCookie` com o mesmo segredo).
- `npm run typecheck` continua passando sem erros.

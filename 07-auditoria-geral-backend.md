# Auditoria geral — Backend (Silvério Barbearia)

Auditoria de ponta a ponta do back-end depois das 5 fases de construção (Fundação →
Agenda → Financeiro/Cliente → Agendamento online/WhatsApp → Testes/Implantação), cada
uma já verificada individualmente. Objetivo aqui era diferente da verificação por fase:
não repetir checagem de escopo fase-a-fase, e sim procurar problemas que só existem na
composição do sistema inteiro — consistência entre fases, segurança de ponta a ponta, a
trava de conflito de horário sob concorrência real, alinhamento com as decisões de
negócio do `planejamento-geral.md`, e prontidão operacional.

Método: leitura do código real de todos os módulos, das 5 migrações SQL e do schema
Drizzle; `npm run typecheck`; e a suíte de concorrência/verificação da Fase 5
(`npm run test:integracao`) rodada de novo, de forma independente, contra Postgres real
(`embedded-postgres`) — não assumida como ainda válida só porque a Fase 5 já a
documentou.

## Resultado da suíte de concorrência (confirmado, não assumido)

**16/16 cenários passaram**, incluindo os 3 de concorrência (dois `POST` simultâneos
pro mesmo horário, reativar agendamento cancelado com conflito existente, agendar dentro
de um bloqueio), o fluxo completo de verificação por WhatsApp, a regressão de sequestro
de conta (Fase 4) e o rate-limiting de reenvio de código (regra 7). Nenhuma das
correções aplicadas em fases anteriores (bootstrap de sócio simplificado, sequestro de
conta, fuso horário do financeiro, sincronização de `ocupacoes_barbeiro`) foi revertida
ou contornada por código de fase posterior.

## Achados e correções aplicadas

Nenhum item **crítico** foi encontrado (a trava de conflito de horário, a separação
`usuarios`/`clientes` e seus middlewares/sessões estão corretos e comprovados por
teste). Quatro itens **importantes** foram encontrados e corrigidos nesta mesma
auditoria:

1. **Opt-in de mensagem automática (regra 9) não era realmente restrito ao canal
   público.** `criarAgendamentoSchema` (schema de balcão, usado pela rota protegida por
   `exigirLogin`) aceitava o mesmo campo `aceitaMensagensAutomaticas` do schema público —
   nada impedia um sócio (ou uma chamada direta à API) de marcar `true` num agendamento
   de balcão, cujo cliente nunca passou pelo fluxo de consentimento explícito da página
   pública, disparando lembrete automático sem opt-in real. **Corrigido**: o campo foi
   removido de `criarAgendamentoSchema` (só existe mais em `agendamentoPublicoSchema`) e
   a rota de balcão (`agendamentos.routes.ts`) passa `aceitaMensagensAutomaticas: false`
   explicitamente ao serviço, em defesa de profundidade.

2. **Cadastro público (`POST /api/publico/clientes/cadastro`) sem nenhum rate-limit.**
   Qualquer pessoa que soubesse o telefone de um cliente já verificado podia repetir
   esse `POST` à vontade — a correção de sequestro de conta da Fase 4 impede a troca de
   senha sem posse do telefone, mas nada impedia forçar `telefone_verificado` de volta
   para `false` repetidamente, bloqueando esse cliente de agendar online até refazer a
   verificação. **Corrigido**: mesmo padrão de limite da regra 7 (por
   telefone + por IP, janela de 15 min) aplicado a essa rota.

3. **Login (sócio e cliente) sem nenhuma defesa contra força bruta.** A regra 7 cobre só
   o envio de código de verificação (custo de mensagem), não login — mas o login do
   sócio dá acesso administrativo total, e nenhum dos dois logins tinha limite de
   tentativas. **Corrigido**: mesmo guarda-defesa aplicado a `POST /api/auth/login` e
   `POST /api/publico/clientes/login`.

4. **Listagens sem paginação.** `listarClientes` (sem `busca`) e `listarLancamentos`
   (sem filtro de data) traziam a tabela inteira — problema real de escala com o volume
   estimado (>1.000 agendamentos/mês), inclusive batendo desnecessariamente no teto de
   CU-horas da Neon (já apertado, ver `CHECKLIST-DEPLOY.md`). **Corrigido**: paginação
   por `limite`/`offset` (padrão 50, teto 100) nas duas listagens, devolvendo `total`
   junto com a página.

Os itens 2 e 3 compartilham a mesma infraestrutura nova: tabela `tentativas_acesso`
(migração `0005_common_groot.sql`) e `shared/rate-limit/rate-limite.util.ts` — ver
comentários no próprio código para o detalhe de janela/limite por contexto
(`login_socio`, `login_cliente`, `cadastro_publico`).

## Observações (não urgentes)

- **Bootstrap de sócio**: `registrar-socio` fica público até o 2º sócio se cadastrar —
  decisão de produto já documentada (Fase 1b), com mitigação operacional no
  `CHECKLIST-DEPLOY.md` (cadastrar os 2 sócios antes de divulgar a URL). A URL de um
  Worker pode em tese ser descoberta antes disso; um segredo de setup único fecharia essa
  janela por completo, mas não é uma regressão nem contradiz a simplicidade já decidida.
- **CU-horas da Neon**: estimativa (65-100%+ do teto free) já documentada com
  honestidade no próprio checklist/README, com plano de monitorar nos primeiros 30-60
  dias — confirmado que segue tratado com seriedade, nada a acrescentar.
- **Pendências de negócio** (`planejamento-geral.md`, seção 3): números de clientes
  ativos/novos para fechar custo de verificação, e confirmação de suporte a Coexistência
  pelo BSP escolhido — seguem em aberto, replicadas corretamente como pendências no
  `CHECKLIST-DEPLOY.md`.
- **Suíte de teste via SQL espelhado**: `teste-integracao.mjs` reimplementa a lógica dos
  services em SQL puro (o driver Neon não fala Postgres puro localmente — ver cabeçalho
  do arquivo), não importa o código real. Uma mudança futura em
  `agendamentos.service.ts`/`verificacao.service.ts` pode divergir silenciosamente do
  espelho sem que o teste perceba. Vale lembrar disso a quem alterar essas funções.
- **Comissão/repartição**: confirmado que nenhuma lógica de divisão automática entre
  sócios existe em nenhum módulo — só soma consolidada + filtro por `barbeiro_id`,
  exatamente como decidido em 09/09/2026.

## Conclusão

Nenhum item crítico. Os 4 itens importantes encontrados foram corrigidos nesta mesma
auditoria e a suíte de testes (`npm run test:integracao`, 16/16) e o typecheck
(`npm run typecheck`) foram confirmados limpos depois de cada correção — não só ao
final.

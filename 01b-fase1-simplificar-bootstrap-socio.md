# Prompt — Simplificar bootstrap de sócio (reverter item 1 da correção anterior)

Este prompt desfaz parte da correção aplicada em `01a-fase1-correcoes.md` (item 1 —
"Bootstrap de sócios: aceitar os 2 iniciais, depois exigir aprovação dos sócios
existentes"). Aquela correção resolveu um bug real (a rota bloqueava o cadastro do 2º
sócio), mas foi além do necessário: criou um sistema de aprovação multi-sócio para
expandir o quadro societário que ninguém do negócio pediu e que não existe no
planejamento (`planejamento-geral.md`) — o modelo de negócio é 2 sócios fixos, sem
previsão de expansão. Volte para a correção mínima do bug original, sem o fluxo de
aprovação.

## O que remover

1. Tabelas `solicitacoes_socio` e `aprovacoes_socio` (e a migração que as criou).
2. Rotas: `POST /api/auth/solicitacoes-socio`, `GET /api/auth/solicitacoes-socio`,
   `POST /api/auth/solicitacoes-socio/:id/aprovar`, `POST /api/auth/solicitacoes-socio/:id/rejeitar`.
3. Qualquer service/schema Zod associado só a esse fluxo (`solicitacoes-socio.*`), se não
   for reaproveitado por mais nada.
4. Trechos do README que descrevem esse fluxo de aprovação.

## O que manter/corrigir (o bug original, resolvido de forma mínima)

`POST /api/auth/registrar-socio` deve:
- Aceitar o cadastro **enquanto houver menos de 2 registros** em `usuarios` (ou seja, o
  1º e o 2º sócio passam livremente).
- Recusar com 403 a partir do momento em que já existem 2 sócios cadastrados — sem
  nenhum fluxo alternativo de aprovação. Se o negócio um dia precisar de um 3º sócio,
  isso é tratado como uma ação administrativa pontual (ex.: alguém com acesso direto ao
  banco cria o registro manualmente ou via uma migração específica àquela época) — não
  precisa de infraestrutura de aprovação construída preventivamente agora.

Atualize o README: a seção de comportamento de bootstrap deve descrever só essa regra
simples ("aceita os 2 primeiros, recusa a partir do 3º"), sem menção ao fluxo de
aprovação que foi removido.

## O que NÃO mexer

Os itens 2 (`.dev.vars`) e 3 (cookie assinado) da correção anterior (`01a-fase1-correcoes.md`)
estavam corretos e devem continuar como estão — este prompt só desfaz o item 1.

## Critério de pronto

- `npm run typecheck` continua passando sem erros.
- 1ª e 2ª chamadas a `registrar-socio` funcionam e criam os 2 sócios.
- 3ª chamada a `registrar-socio` é recusada com 403, sem nenhuma rota de aprovação
  disponível como alternativa.
- Nenhum resquício de `solicitacoes_socio`/`aprovacoes_socio` no schema, nas rotas ou no
  README.
- O comportamento de cookie assinado (item 3 da correção anterior) e o carregamento de
  `.dev.vars` (item 2) continuam funcionando sem alteração.
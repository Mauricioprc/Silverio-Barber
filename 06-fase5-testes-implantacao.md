# Prompt — Fase 5: Testes e Implantação (Silvério Barbearia)

Cole este prompt no Claude Code junto com o documento `00-arquitetura-e-convencoes.md`.
Use o código já existente das Fases 1-4 (implementadas e verificadas, incluindo a
correção de sequestro de conta na Fase 4).

Esta é a última fase de back-end antes do frontend (que entra como planejamento próprio,
depois desta fase — ver `planejamento-geral.md`). O objetivo aqui não é escrever
funcionalidade nova, é validar sob condições reais e preparar o deploy real.

## Escopo desta fase

1. **Teste de concorrência de agendamento, consolidado**: reunir num script de teste
   único (não só validação manual pontual) os cenários de concorrência já identificados
   ao longo do projeto:
   - Dois `POST /api/agendamentos` simultâneos pro mesmo barbeiro/horário → um aceito, um
     rejeitado por `23P01`.
   - Reativar um agendamento cancelado (mudar status de volta) enquanto outro horário
     conflitante existe → deve ser rejeitado (regressão do bug já corrigido na Fase 2 —
     `ocupacoes_barbeiro` precisa continuar sincronizada em todo caminho de mudança de
     status, não só criação).
   - Criar agendamento dentro de um bloqueio de agenda existente → rejeitado.
   Rodar contra Postgres real (mesma abordagem já usada nas verificações anteriores —
   `embedded-postgres` ou instância real), não simulação teórica. Documentar os
   resultados no README.

2. **Teste do fluxo completo de verificação por WhatsApp e do sequestro de conta**:
   - Fluxo normal: cadastro público → código enviado (via `EnviadorWhatsapp` mock) →
     confirmação → `telefone_verificado = true`.
   - Regressão do sequestro de conta (Fase 4): tentar cadastro público com telefone já
     existente do balcão, confirmar que nome/senha não mudam até confirmar o código, e
     que uma segunda tentativa de outro "atacante" não consegue confirmar o código do
     dono real.
   - Rate-limiting (regra 7): confirmar de novo que a 4ª tentativa de reenvio em 15
     minutos é rejeitada — esse teste já foi feito na Fase 4, mas deve ser incluído na
     suíte de regressão desta fase, não descartado.

3. **Checagem de CU-horas de computação da Neon**: com o volume estimado do negócio
   (>1.000 agendamentos/mês, mais tráfego de navegação/consulta de disponibilidade),
   estimar o uso real de compute contra o teto de 100 CU-horas/mês do plano free (ver
   `00-arquitetura-e-convencoes.md`). Se a estimativa se aproximar do teto (ex.: acima de
   70-80% de uso projetado), documentar isso explicitamente como recomendação de upgrade
   antes do lançamento, em vez de descobrir depois que o banco ficou suspenso em produção.

4. **Configuração de domínio e roteamento** (ver nota operacional do documento de
   convenções): configurar `dominio.com.br/api/*` apontando pro Worker e o restante pro
   Pages, sob o mesmo domínio-base — **não usar subdomínios separados**, conforme já
   decidido. Validar de ponta a ponta que o cookie de sessão (sócio e cliente) funciona
   corretamente nesse ambiente real, não só em dev local (onde o problema não aparece).

5. **Backup do banco**: configurar rotina de backup do Neon (o plano free tem histórico de
   restauração instantânea de 6 horas, conforme documentado — avaliar se isso é
   suficiente ou se vale complementar com um export periódico próprio, dado que é dado
   financeiro e de agendamento de um negócio real).

6. **Checklist de produção consolidado**: reunir num único documento (`CHECKLIST-DEPLOY.md`
   ou seção do README) todos os passos de pré-produção já mencionados nas fases
   anteriores — criar projeto Neon real, gerar segredo de sessão real, aplicar migrações,
   cadastrar os 2 sócios, configurar domínio/roteamento, contratar BSP e confirmar suporte
   a Coexistência (ver nota da Fase 4), configurar `EnviadorWhatsapp` real com credenciais
   de produção, configurar backup — para que o deploy real não dependa de garimpar
   informação espalhada em 5 documentos diferentes.

## Fora do escopo desta fase

- Qualquer funcionalidade nova de produto — esta fase é validação e preparação, não
  desenvolvimento de feature.
- Frontend — planejamento próprio, à parte.

## Critério de pronto

A Fase 5 está pronta quando: a suíte de testes de concorrência roda contra Postgres real
e passa nos três cenários listados, o fluxo de verificação e a defesa contra sequestro de
conta foram testados de ponta a ponta (não só a correção pontual), a estimativa de uso de
CU-horas da Neon foi calculada e comparada ao teto do plano free, o roteamento por
caminho único está configurado e o cookie de sessão foi validado nesse ambiente, existe
uma estratégia de backup documentada, e existe um checklist único e completo de deploy
que qualquer pessoa (não só quem escreveu o código) consegue seguir.
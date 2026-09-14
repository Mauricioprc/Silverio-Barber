# Checklist de Deploy — Silvério Barbearia

Documento único (Fase 5) reunindo todos os passos de pré-produção já mencionados
espalhados nos prompts de cada fase — não precisa garimpar informação em 5 documentos
diferentes na hora do deploy real. Siga na ordem. Cada item linka para a seção do README
ou do documento de convenções com o detalhe técnico completo, quando aplicável.

Marque cada item conforme for concluído — este é o checklist que qualquer pessoa (não só
quem escreveu o código) deve conseguir seguir.

## 1. Banco de dados (Neon)

- [ ] Criar um projeto Neon de **produção** (free, sem cartão de crédito — 100
      CU-horas/mês, 0,5 GB de armazenamento). Não reaproveitar o projeto de
      desenvolvimento.
- [ ] Confirmar que `btree_gist` ativa sem erro nesse projeto específico:
      `CREATE EXTENSION IF NOT EXISTS btree_gist;` (já é o primeiro passo da migração
      `0001`, mas vale confirmar manualmente antes do deploy — ver
      `00-arquitetura-e-convencoes.md`, regra 8).
- [ ] Aplicar as migrações no banco real: `DATABASE_URL=<url-de-producao> npm run
      db:migrate` (dentro de `apps/api`).
- [ ] Ler a seção **"3. Estimativa de CU-horas"** abaixo antes de assumir que o plano
      free é suficiente — a estimativa deste projeto está na faixa de atenção (65-100%
      do teto), não folgada.
- [ ] Configurar backup — ver seção **"5. Backup"** abaixo.

## 2. Segredos e variáveis de ambiente

Todos via `wrangler secret put <NOME>` (nunca em `wrangler.toml`) dentro de `apps/api`:

- [ ] `DATABASE_URL` — string de conexão do projeto Neon de produção (passo 1).
- [ ] `SESSAO_SECRETO` — valor aleatório forte, gerado só para produção (`openssl rand
      -base64 48` ou equivalente). Não reaproveitar o de desenvolvimento.
- [ ] `WHATSAPP_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID` — só depois do passo 4 (WhatsApp)
      estar concluído.

E em `wrangler.toml`, seção `[env.production.vars]` (não sensível, pode ficar no
repositório):

- [ ] `WHATSAPP_MODO = "real"` (só depois do passo 4 concluído — até lá, deixar em
      `"mock"` é seguro e intencional, o sistema continua funcionando sem enviar
      WhatsApp de verdade).
- [ ] `WHATSAPP_TEMPLATE_CONFIRMACAO` e `WHATSAPP_TEMPLATE_LEMBRETE` — nomes exatos dos
      templates aprovados pela Meta (passo 4).

## 3. Estimativa de CU-horas (Neon, plano free)

Ver metodologia completa e números no README, seção **"Estimativa de uso de CU-horas
(Neon)"**. Resumo: a estimativa deste projeto fica entre **~65% e ~100%+** do teto de 100
CU-horas/mês do plano free, dependendo de quantos dias/semana a barbearia abre e de
quanto tráfego a página pública de agendamento recebe fora do horário comercial —
**não é uma folga confortável**.

- [ ] Ler a estimativa completa no README antes de decidir.
- [ ] Nos primeiros 30-60 dias em produção, acompanhar o uso real no painel do Neon
      (Usage → Compute) semanalmente.
- [ ] Se o uso projetado (extrapolando a primeira semana/quinzena) passar de ~70-80 CU-
      horas/mês, fazer upgrade para um plano pago da Neon **antes** de bater no teto —
      não esperar o banco ficar suspenso em produção para agir. Orçar essa possibilidade
      desde já, não tratar como cenário improvável.

## 4. WhatsApp (conta comercial + BSP)

- [ ] Conta comercial WhatsApp aprovada pela Meta, número de telefone configurado.
- [ ] Template de confirmação de agendamento aprovado (aprovação separada da conta em
      si — ver `planejamento-geral.md`, prazo próprio).
- [ ] Template de lembrete aprovado (mesma observação).
- [ ] Confirmar com o provedor/BSP escolhido se ele suporta **Coexistência** (permite
      manter o app comum do WhatsApp Business no celular de quem atende, em paralelo à
      API — ver nota operacional em `05-fase4-agendamento-online-whatsapp.md`). Nem todo
      BSP suporta ainda, mesmo a Meta já oferecendo o recurso.
- [ ] Se usando Coexistência: documentar internamente que o app precisa ser aberto pelo
      menos 1x por semana no celular de quem atende, ou a conexão com a API cai.
- [ ] Configurar `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` (segredos, passo 2) e
      `WHATSAPP_MODO=real` + nomes dos templates (`wrangler.toml`, passo 2).
- [ ] Testar manualmente um envio de cada tipo (verificação, confirmação, lembrete) em
      produção antes de considerar concluído — ver checklist completo no README, seção
      "`EnviadorWhatsapp`: mock vs. real".

## 5. Backup

Ver detalhe completo no README, seção **"Estratégia de backup"**. Resumo:

- [ ] Point-in-time restore de 6 horas do plano free da Neon está disponível
      automaticamente — nenhuma configuração extra necessária, mas **não é suficiente
      sozinho** para este projeto (dado financeiro/de agendamento de um negócio real,
      6h de janela é pouco se um problema for notado um dia depois).
- [ ] Configurar um export periódico próprio complementar (`pg_dump` agendado) — ver
      README para o comando exato e a recomendação de frequência/retenção.
- [ ] Testar pelo menos uma vez, antes do lançamento, que o export gerado é restaurável
      de verdade (não só "o comando rodou sem erro") — restaurar num banco à parte e
      conferir os dados.

## 6. Domínio e roteamento

- [ ] Domínio registrado (a definir com o proprietário — ver `planejamento-geral.md`).
- [ ] Domínio adicionado como zona no Cloudflare.
- [ ] `apps/api/wrangler.toml`, seção `[env.production]`: substituir os dois
      `<SEU-DOMINIO>` pelo domínio real.
- [ ] Confirmar **roteamento por caminho único** (`dominio.com.br/api/*` → Worker,
      resto → Pages) — **não usar subdomínios separados** (`app.dominio.com.br` +
      `api.dominio.com.br`). Ver `00-arquitetura-e-convencoes.md`, nota operacional
      sobre cookies, para o motivo técnico completo (cookie `SameSite=Strict` sem
      atributo `Domain` explícito não é compartilhado entre subdomínios).
- [ ] `npm run deploy:producao` (dentro de `apps/api`) — aplica a rota do Worker.
- [ ] Configurar o projeto Cloudflare Pages do frontend (quando existir — Fase de
      frontend é planejamento à parte, ver `planejamento-geral.md`) no mesmo domínio,
      sem caminho `/api/*` (a rota do Worker tem prioridade sobre Pages nesse padrão,
      então não precisa de configuração adicional do lado do Pages para não colidir).
- [ ] **Validar de ponta a ponta, no domínio real** (não em dev local — o problema de
      cookie só aparece com domínio público de verdade):
  1. Fazer login de sócio (`POST /api/auth/login`) contra `https://dominio.com.br/api/auth/login`.
  2. No DevTools do navegador (aba Application/Storage → Cookies), confirmar que o
     cookie `silverio_sessao` foi setado com `Secure`, `HttpOnly`, `SameSite=Strict`, e
     sem atributo `Domain` explícito (host-only, do próprio `dominio.com.br`).
  3. Navegar para uma página servida pelo Pages no mesmo domínio e confirmar que uma
     chamada `fetch` para `/api/servicos` (ou outra rota protegida) envia o cookie
     automaticamente e recebe `200`, não `401`.
  4. Repetir os 3 passos acima para o cookie de **cliente** (`silverio_sessao_cliente`,
     via `POST /api/publico/clientes/login`) — é uma sessão/cookie separado, precisa ser
     validado separadamente.

## 7. Bootstrap dos sócios

- [ ] Assim que o deploy estiver no ar (e **antes de divulgar a URL pública**), cadastrar
      os 2 sócios via `POST /api/auth/registrar-socio` — a rota se fecha sozinha depois
      do 2º registro (ver README, seção "Comportamento de bootstrap"). Até esse momento,
      qualquer pessoa que descobrir a URL poderia se cadastrar como sócio.

## 8. Testes finais antes de anunciar o lançamento

- [ ] Rodar `npm run test:integracao` (dentro de `apps/api`) uma última vez antes do
      deploy — suíte de concorrência + verificação + regressão de sequestro de conta +
      rate-limiting, contra Postgres real (ver README, seção "Suíte de teste de
      integração consolidada").
- [ ] Fluxo manual completo em produção: cadastro de cliente público → verificação por
      WhatsApp de verdade (não mock) → agendamento online → conferir que o lançamento
      financeiro aparece certo.

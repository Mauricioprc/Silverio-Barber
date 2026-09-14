# Prompt — Fase 4: Agendamento Online + WhatsApp (Silvério Barbearia)

Cole este prompt no Claude Code junto com o documento `00-arquitetura-e-convencoes.md`.
Use o schema e o código já existentes das Fases 1, 2 e 3 como base.

Ponto de partida: Fases 1-3 implementadas e verificadas (sócios/barbeiros/serviços,
agenda com trava de conflito, clientes cadastrados pelo balcão com
`telefone_verificado = false`, financeiro automático).

## Contexto do negócio

Esta é a fase que abre o sistema pro público — cliente passa a poder se cadastrar/logar
sozinho e agendar sem depender do balcão. Duas regras não-negociáveis do documento de
convenções só entram em vigor a partir desta fase: regra 7 (rate-limiting de código de
verificação) e regra 9 (opt-in explícito pra mensagem automática). As duas são
obrigatórias, não opcionais — um endpoint público de verificação sem rate-limit é
exposição financeira direta (cada envio custa dinheiro real via Meta).

**Dependência externa que pode não estar pronta ainda**: aprovação da conta comercial do
WhatsApp (Meta) e contratação do provedor/BSP têm prazo próprio e podem não ter sido
concluídos quando este código for escrito. Construa a integração de envio de WhatsApp
atrás de uma interface (`EnviadorWhatsapp` ou equivalente) com uma implementação real (que
chama a API do provedor) e uma implementação de desenvolvimento/mock (loga a mensagem em
vez de enviar de verdade), selecionável por variável de ambiente. Isso permite terminar e
testar todo o resto do fluxo (cadastro, verificação, rate-limit, agendamento) sem
depender da aprovação da Meta estar pronta.

## Escopo desta fase

1. **Login/cadastro público de cliente**:
   - `POST /api/publico/clientes/cadastro` — cliente se cadastra sozinho (nome, telefone,
     senha). Se o telefone já existe em `clientes` (cadastrado pelo balcão na Fase 3),
     vincula à conta existente em vez de criar duplicata — trate esse caso explicitamente,
     não deixe criar dois registros pro mesmo telefone.
   - `POST /api/publico/clientes/login` — mesma lógica de sessão persistente das regras 2
     e 3 do documento de convenções, cookie próprio de cliente (não reaproveitar sessão
     de sócio — são contextos de autorização diferentes, ver a separação `usuarios`/
     `clientes` já decidida).

2. **Verificação de telefone por WhatsApp, sob demanda** (ver decisão registrada no
   `planejamento-geral.md`, seção 2 — clientes da Fase 3 verificam só quando tentarem usar
   o canal público pela primeira vez, não em massa):
   - `POST /api/publico/clientes/verificacao/enviar` — gera código, envia via
     `EnviadorWhatsapp`, salva com expiração (ex.: 10 minutos). **Aplicar a regra 7 aqui
     obrigatoriamente**: no máximo 3 envios por telefone a cada 15 minutos com backoff
     crescente, mais limite por IP.
   - `POST /api/publico/clientes/verificacao/confirmar` — valida código, marca
     `telefone_verificado = true`. Código expirado ou incorreto retorna erro claro sem
     vazar se o telefone existe ou não (mesma lógica anti-enumeração da regra 3).

3. **Opt-in de mensagem automática (regra 9)**: campo explícito no cadastro/primeiro
   agendamento online (`aceita_mensagens_automaticas`, boolean, não pré-marcado no
   frontend — a API deve rejeitar/tratar como `false` se o campo não vier setado
   explicitamente como `true`, nunca assumir consentimento por omissão).

4. **Página pública de agendamento (rotas da API que a sustentam)**: fluxo
   Serviço → Barbeiro → Data/Horário disponível → Login/Cadastro → Confirmação.
   - `GET /api/publico/servicos` — lista serviços ativos (sem autenticação).
   - `GET /api/publico/barbeiros` — lista barbeiros ativos (sem autenticação).
   - `GET /api/publico/disponibilidade?barbeiro_id=&data=` — calcula horários livres
     cruzando `disponibilidade_barbeiro` (Fase 1) com `ocupacoes_barbeiro` (Fase 2) —
     **não é uma tabela nova, é lógica de leitura sobre o que já existe**.
   - `POST /api/publico/agendamentos` — cria agendamento vinculado ao `cliente_id` da
     sessão autenticada. Exige `telefone_verificado = true` — se não estiver verificado,
     retornar erro específico indicando que precisa completar a verificação antes (aciona
     o fluxo do item 2 no frontend). Passa pela mesma trava de conflito da Fase 2 (nenhuma
     regra nova de concorrência aqui — reaproveita o que já existe e já foi testado).

5. **Botão de envio manual (`wa.me`), disponível em paralelo à automação**: na visão de
   agenda (já existente da Fase 2), adicionar um botão "Enviar mensagem" em cada
   agendamento, que monta a mensagem (nome do cliente, serviço, barbeiro, data, horário,
   valor — mesmos dados que o template automático usa) e gera um link
   `https://wa.me/<telefone só dígitos com DDI>?text=<mensagem codificada>`, abrindo em
   nova aba/janela para o sócio revisar e clicar em enviar pelo WhatsApp Web/app dele.
   Isso não depende de `EnviadorWhatsapp`, do rate-limiting (regra 7) ou do opt-in (regra
   9) — é o sócio mandando manualmente, não o sistema mandando automaticamente; a regra 9
   continua valendo só para o envio automático do item 6. Esse botão fica disponível
   mesmo depois que a automação (item 6) estiver funcionando — não é uma etapa transitória
   a ser removida depois, é uma alternativa permanente para quando o sócio preferir
   revisar/personalizar a mensagem antes de enviar, ou simplesmente mandar algo fora do
   que os templates aprovados cobrem.
   Implementação: função pura de montagem de URL (nome do módulo sugerido:
   `mensagemManual.util.ts` dentro de `agendamentos/`, já que só esse módulo usa) —
   sem chamada de rede, é só string building; a abertura do link é responsabilidade do
   frontend (fora de escopo desta fase), mas a API deve expor um endpoint que devolve a
   URL pronta (ex.: `GET /api/agendamentos/:id/link-whatsapp`) para o frontend não
   precisar reimplementar a lógica de montagem de mensagem/telefone.

6. **Confirmação e lembrete automático via WhatsApp**:
   - Ao criar um agendamento (via rota pública), se `aceita_mensagens_automaticas = true`,
     enviar mensagem de confirmação via `EnviadorWhatsapp` usando um template (nome do
     template configurável — a aprovação do template pela Meta é processo separado da
     aprovação da conta, conforme registrado no `planejamento-geral.md`).
   - Lembrete: implementar como uma função separada e agendável (ex.: um endpoint interno
     ou job que varre agendamentos do dia seguinte e envia lembrete) — não é necessário
     implementar o mecanismo de agendamento do job em si nesta fase (cron do Workers ou
     equivalente), mas a função que decide "quem precisa de lembrete agora" deve existir e
     ser testável isoladamente.

## Fora do escopo desta fase

- Frontend visual (`apps/web`) — este prompt cobre só a API pública. Se o frontend for
  construído em paralelo, ele consome essas rotas.
- Testes de carga/concorrência em produção real e configuração de domínio — isso é Fase 5.
- Qualquer mudança nas regras de negócio já fechadas (repartição de faturamento, etc.).

## Entregáveis esperados

- Código completo seguindo a estrutura de pastas do documento de convenções (módulos
  `publico/` ou dividido entre `clientes/`, `agendamentos/`, `verificacao/` — decida e
  documente, mantendo a mesma lógica de módulo por domínio já usada nas fases anteriores).
- Migração Drizzle com o que for necessário (coluna de opt-in em cliente ou agendamento,
  tabela de códigos de verificação com expiração).
- Implementação mock de `EnviadorWhatsapp` documentada no README, com instrução clara de
  como trocar para a implementação real quando o provedor/BSP estiver contratado.
- Teste do rate-limiting: disparar 4 tentativas de reenvio de código em sequência rápida
  para o mesmo telefone e confirmar que a 4ª é rejeitada — documentar o resultado real, não
  assumido.
- `README.md` atualizado: novas rotas públicas, comportamento de vínculo automático de
  cliente pré-cadastrado, e checklist do que falta pra ligar o `EnviadorWhatsapp` real em
  produção (credenciais do BSP, nome do template aprovado).

## Critério de pronto

A Fase 4 está pronta quando: cliente consegue se cadastrar/logar sozinho, a verificação
por WhatsApp funciona ponta a ponta com o `EnviadorWhatsapp` mock, o rate-limiting da
regra 7 foi testado e funciona de verdade, o opt-in da regra 9 é exigido explicitamente
antes de qualquer envio automático, agendamento público exige telefone verificado,
nenhuma mensagem automática é enviada sem consentimento explícito registrado, e o botão
de envio manual (item 5) funciona de forma totalmente independente da automação — deve
continuar funcionando mesmo com `EnviadorWhatsapp` no modo mock/sem credenciais reais.

## Nota operacional: WhatsApp Coexistência

Confirmado (14/09/2026): a Meta lançou o recurso de "Coexistência", disponível
globalmente desde junho de 2026 (incluindo Brasil), que permite usar o mesmo número
simultaneamente no app comum do WhatsApp Business (no celular de quem atende) e na API
oficial (usada pela automação desta fase) — não é mais necessário abrir mão do app pra
ativar a API, como era antes. Limitação a documentar no checklist de pré-produção: o app
precisa ser aberto pelo menos uma vez por semana, ou a conexão com a API cai. Confirmar
com o provedor/BSP escolhido se ele já suporta Coexistência antes de contratar — nem todo
BSP necessariamente implementou o recurso ainda, mesmo estando disponível pela Meta.
# Planejamento — Arquitetura, Decisões e Fases de Construção

**Sistema de gestão · Barbearia Silvério**
Atualizado em 14/09/2026 · Câmbio de referência: US$ 1 = R$ 5,09

> A partir desta versão, a arquitetura e as convenções técnicas vivem em
> [`00-arquitetura-e-convencoes.md`](00-arquitetura-e-convencoes.md) e cada fase de
> construção em seu próprio prompt auto-contido (`01-fase1-fundacao.md`, ...). Este
> documento é o histórico de decisões e o mapa das fases — não repete o conteúdo técnico
> detalhado que já está nos outros dois arquivos.

---

## 1. Arquitetura definida (resumo — detalhe completo e fontes em `00-arquitetura-e-convencoes.md`)

Cloudflare Pages + Cloudflare Workers (hospedagem, grátis, sem restrição de uso
comercial) + Neon Postgres (banco, plano free — sem cartão de crédito, 100 CU-horas/mês,
0,5 GB de armazenamento, verificado na documentação oficial da Neon) + Drizzle (ORM) +
Zod (validação) + Hono (framework HTTP).

Decisões de arquitetura que vale registrar o *porquê*, já que mudaram de rumo ou foram
verificadas tecnicamente durante o planejamento:

- **Postgres/Neon em vez de D1 (SQLite)**: a regra de negócio mais crítica do sistema é
  impedir dois agendamentos conflitantes no mesmo horário/barbeiro. Postgres resolve isso
  no próprio banco via *exclusion constraint* (`EXCLUDE USING gist`); D1/SQLite exigiria
  confiar só na lógica da aplicação, frágil sob concorrência real. Isso virou regra
  não-negociável (regra 8 do documento de convenções). **Verificado (14/09/2026)**: essa
  constraint exige a extensão `btree_gist` (confirmada disponível em todos os planos Neon,
  incluindo o free) — sem ela, a combinação de igualdade (`barbeiro_id`) com intervalo
  (`tsrange`) na constraint não pode ser criada. Isso já está registrado como
  pré-requisito explícito na regra 8.
- **Não Vercel**: o plano free da Vercel proíbe uso comercial pelos termos deles (inclui
  explicitamente "receber pagamento para criar, atualizar ou hospedar o site").

**Ponto a monitorar (não bloqueador)**: teto de 100 CU-horas/mês do plano free da Neon —
checar uso real na Fase 5 (ver seção 4) conforme o volume crescer.

**Pendência operacional (não bloqueia Fases 1-3, mas é pré-requisito de deploy)**:
Cloudflare Pages e Workers usam domínios-base diferentes por padrão
(`*.pages.dev` / `*.workers.dev`), o que quebra o cookie de sessão `SameSite=Strict`
entre front e API. **Verificado (14/09/2026)**: colocar front e API sob o mesmo
domínio-base via subdomínios (`app.` e `api.`) não resolve sozinho — um cookie sem
`Domain` explícito é *host-only* e não é compartilhado nem entre subdomínios do mesmo
domínio-base. A recomendação registrada no documento de convenções é usar roteamento por
caminho único (`dominio.com.br/api/*`) em vez de subdomínios, o que evita o problema por
completo. Domínio final ainda não registrado; o proprietário decide o nome quando for dar
o deploy.

**Decisão de modelagem registrada (14/09/2026)**: `usuarios` (Fase 1) é exclusiva de
sócios/administradores — a Fase 3 cria uma tabela `clientes` separada, em vez de
reaproveitar `usuarios`, para não misturar contas com acesso administrativo total e
contas de usuário final numa mesma tabela (risco de bug de autorização). Ver justificativa
completa no documento de convenções.

---

## 2. Decisões fechadas na reunião com o proprietário (09/09/2026)

| Tema | Decisão |
|---|---|
| **Divisão de faturamento entre sócios** | Dashboard mostra faturamento consolidado por padrão, com filtro pra ver só de um sócio ou do outro. Sem cálculo de divisão/repasse automático — é visão, não repartição. |
| **Identificação do cliente** | Cadastro completo: nome + telefone + senha. Verificação do telefone pelo **WhatsApp** (não SMS), decisão consciente pra não ter retrabalho de canal depois. |
| **Login recorrente** | Sessão persistente no dispositivo (30 dias). Login só é pedido de novo em aparelho novo ou pra ação sensível. Verificação de telefone é evento único no cadastro, não repetido a cada acesso. |
| **WhatsApp automatizado (confirmação/lembrete)** | Fica pra Fase 4, mas a integração com a API oficial já existe desde a etapa de verificação — ativar automação depois é extensão, não retrabalho. |
| **Domínio** | A definir com o proprietário no momento do deploy (ver seção 1). |
| **Volume esperado** | Mais de 1.000 agendamentos online/mês somando os 2 barbeiros. |

### Cadastro de cliente na Fase 3 e verificação sob demanda na Fase 4

Fase 3 cadastra cliente **pelo balcão/staff** (presencial, sem app público ainda — a
página de agendamento online só existe na Fase 4), numa tabela `clientes` própria (ver
seção 1). Clientes cadastrados na Fase 3 ficam marcados como `telefone_verificado = false`
e seguem agendando normalmente pelo balcão. Quando o canal online for lançado (Fase 4), a
verificação é pedida **sob demanda**, na primeira vez que aquele cliente tentar entrar
pelo canal público — não em massa. Isso evita gastar com verificação de quem nunca vai
usar o autoatendimento.

### WhatsApp Coexistência e botão manual de envio (decidido em 14/09/2026)

**Verificado**: a Meta lançou "Coexistência", disponível globalmente desde junho de 2026
(incluindo Brasil) — o mesmo número pode ser usado ao mesmo tempo no app comum do
WhatsApp Business e na API oficial (BSP), sem precisar abrir mão do app como era exigido
antes. Requisito operacional: abrir o app pelo menos 1x por semana, ou a API desconecta.
Confirmar com o BSP escolhido se ele já suporta esse modo antes de contratar.

**Decisão de produto**: além da automação via API (Fase 4b — confirmação/lembrete
automático, verificação de telefone), mantém-se um botão de envio manual (link `wa.me`)
na agenda, disponível permanentemente — não é uma etapa transitória até a automação ficar
pronta, é uma alternativa que o sócio pode preferir usar mesmo depois, pra revisar/
personalizar a mensagem antes de enviar. Ver detalhe técnico no prompt da Fase 4.

### Aprovação de conta comercial WhatsApp vs. aprovação de template

São duas aprovações distintas da Meta, com prazos próprios e sequenciais (a segunda só
começa depois da primeira estar concluída, não em paralelo): a conta comercial em si, e o
*template* de mensagem usado para confirmação/lembrete automático (mensagem iniciada pelo
negócio, fora da janela de 24h). Escrever o texto do template cedo e submeter assim que a
conta for aprovada, em vez de deixar para a etapa de "automação" da Fase 4.

---

## 3. Custo mensal estimado

| Item | Custo |
|---|---|
| Hospedagem (Cloudflare Pages + Workers + Neon Postgres, plano free) | R$ 0 |
| WhatsApp automatizado (confirmação/lembrete, categoria Utility, ~2 msgs/agendamento) — escala com agendamentos | R$ 70 a R$ 84/mês (base 1.000-1.200 agendamentos/mês) |
| Verificação de telefone (evento único por cliente, não por agendamento) | A calcular — escala com clientes novos/mês, não com agendamentos/mês. Ver pendência abaixo. |
| Assinatura do provedor/BSP (Zenvia, 360dialog, etc.) | A cotar |
| Domínio | ≈ R$ 40–90/ano (fora da mensalidade) |

**Pendência**: pra fechar o número de verificação (pico de migração inicial + regime de
cruzeiro), precisamos do proprietário: (1) quantos clientes ativos a barbearia tem hoje
(estimado), e (2) quantos clientes novos por mês costumam aparecer.

---

## 4. Fases de construção

Escopo técnico detalhado de cada fase vive no prompt correspondente, não aqui.

- **Fase 1 — Fundação** ([`01-fase1-fundacao.md`](01-fase1-fundacao.md)): banco (`usuarios`
  exclusiva de sócios), auth dos 2 sócios, CRUD de serviços, cadastro de
  barbeiros/disponibilidade. **Pronta para execução no Claude Code.**
- **Fase 2 — Agenda**: visão diária, criar/editar/cancelar/reagendar, trava de conflito
  via exclusion constraint com `btree_gist` (regra 8, com pré-requisito de extensão já
  documentado), bloqueios de folga/feriado.
- **Fase 3 — Financeiro e cadastro de cliente**: tabela `clientes` própria (separada de
  `usuarios` — ver seção 1) cadastrada pelo balcão (sem verificação ainda), registro de
  pagamento, dashboard consolidado + filtro por sócio.
- **Fase 4 — Agendamento online + WhatsApp**: aprovação de conta comercial e template
  (iniciar cedo, em paralelo às Fases 1-3), página pública de agendamento, verificação sob
  demanda, rate-limiting (regra 7) e opt-in (regra 9) obrigatórios, confirmação/lembrete
  automático.
- **Fase 5 — Testes e implantação**: teste de concorrência de agendamento, teste do fluxo
  de verificação, checagem de CU-horas de computação da Neon contra o teto do plano free,
  deploy com domínio configurado (roteamento por caminho único, ver seção 1) e backup do
  banco.

**Recomendação mantida**: iniciar a aprovação da conta comercial do WhatsApp em paralelo
às Fases 1-3 — é o único item que depende de terceiro (Meta) e pode atrasar o lançamento
se só for iniciado no fim.

---

## 4.1 Frontend — planejamento próprio, depois do back-end (decidido em 14/09/2026)

Nenhuma das fases 1-5 inclui frontend (`apps/web`) — isso foi identificado como uma
lacuna do planejamento original, nunca tinha sido de fato agendado. Decisão: terminar
todo o back-end (Fases 1-5) primeiro, com a API inteira estável e verificada, e só então
planejar o frontend como uma etapa própria — não fatiado dentro das fases de back-end.
Quando chegar a hora, o planejamento do frontend entra como um novo documento/conjunto de
prompts, no mesmo formato (`00-...` de convenções próprio de frontend + um prompt por
fase de tela, se fizer sentido dividir), seguindo o mesmo processo de um chat por fase e
um chat de verificação.

## 5. Fluxo de construção a partir de 13/09/2026

O código de cada fase é entregue como prompt estruturado para o Claude Code executar,
seguindo `00-arquitetura-e-convencoes.md` (arquitetura + convenções + regras
não-negociáveis, com fontes verificadas — vale para todas as fases) e um prompt por fase,
auto-contido, com escopo, fora-de-escopo explícito e critério de pronto.

Não existe código de nenhuma fase anterior a este processo — o repositório começou vazio
e a Fase 1 é construída do zero na arquitetura Postgres/Neon.

## 6. Verificações técnicas feitas em 14/09/2026 (fontes)

Pra fechar este documento com 100% de embasamento antes de seguir pro desenvolvimento,
os seguintes pontos técnicos foram checados contra documentação oficial/fontes técnicas,
não assumidos:

- Limites reais do plano free da Neon (100 CU-horas/mês, 0,5 GB armazenamento, sem cartão
  de crédito, autosuspend obrigatório após 5 min): [Neon plans](https://neon.com/docs/introduction/plans), [Neon free plan limits FAQ](https://neon.com/faqs/free-plan-limits-and-quotas).
- Disponibilidade da extensão `btree_gist` em todos os planos Neon, incluindo free: [The btree_gist extension — Neon Docs](https://neon.com/docs/extensions/btree_gist).
- Sintaxe correta e pré-requisito da exclusion constraint para evitar sobreposição de
  horário por recurso: [PostgreSQL's GiST Exclusion Constraint — Amit Avraham](https://amitavroy.com/articles/postgresql-gist-exclusion-constraintthe-database-evel-answer-to-double-bookings).
- Comportamento de cookies `SameSite=Strict` entre subdomínios e a necessidade do
  atributo `Domain` explícito para compartilhamento entre subdomínios: [SameSite cookies explained — web.dev](https://web.dev/articles/samesite-cookies-explained), [MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie).
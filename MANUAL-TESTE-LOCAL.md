# Manual — como testar o sistema localmente contra o Neon real

Pré-requisito: `apps/api/.dev.vars` já existe com `DATABASE_URL` (Neon) e `SESSAO_SECRETO`
preenchidos, e a migração já foi aplicada (`npm run db:migrate`). Se ainda não fez isso,
rode primeiro:

```bash
npm run db:migrate
```

## 1. Subir os dois servidores

Em dois terminais separados, na raiz do repositório:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

- API: `http://127.0.0.1:8787` (Wrangler/Miniflare).
- Front: `http://localhost:5173` (Vite) — o `vite.config.ts` já faz proxy de `/api/*`
  para a API, então acesse sempre pela porta do front (`5173`), nunca direto na `8787`.

## 2. Banco novo = sem dados. Criar o primeiro sócio, serviço e disponibilidade

Ainda não existe tela de cadastro de sócio/serviço no painel (é fase futura) — hoje isso
só se faz chamando a API diretamente. Rode uma vez (com a API no ar):

```bash
curl -s -X POST http://127.0.0.1:8787/api/auth/registrar-socio \
  -H "Content-Type: application/json" \
  -d '{"nome":"Seu Nome","telefone":"11999990000","senha":"umaSenhaForte123"}'
```

Guarde o `Set-Cookie` da resposta de login ou repita o login para pegar um cookie de
sessão (mais simples: use `--cookie-jar cookies.txt` no login e reaproveite):

```bash
curl -s -c cookies.txt -X POST http://127.0.0.1:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"telefone":"11999990000","senha":"umaSenhaForte123"}'
```

Criar um serviço (valor em **centavos**):

```bash
curl -s -b cookies.txt -X POST http://127.0.0.1:8787/api/servicos \
  -H "Content-Type: application/json" \
  -d '{"nome":"Corte Simples","descricao":"Corte de cabelo","valorCentavos":5000,"duracaoMinutos":30}'
```

Descobrir o `id` do barbeiro (o próprio sócio já virou barbeiro no registro):

```bash
curl -s -b cookies.txt http://127.0.0.1:8787/api/barbeiros
```

Cadastrar disponibilidade semanal (exemplo: todo dia das 9h às 18h; `diaSemana` 0=domingo
... 6=sábado; troque `1` no caminho pelo `id` do barbeiro se for diferente):

```bash
curl -s -b cookies.txt -X PUT http://127.0.0.1:8787/api/barbeiros/1/disponibilidade \
  -H "Content-Type: application/json" \
  -d '{"disponibilidade":[
    {"diaSemana":0,"horaInicio":"09:00","horaFim":"18:00"},
    {"diaSemana":1,"horaInicio":"09:00","horaFim":"18:00"},
    {"diaSemana":2,"horaInicio":"09:00","horaFim":"18:00"},
    {"diaSemana":3,"horaInicio":"09:00","horaFim":"18:00"},
    {"diaSemana":4,"horaInicio":"09:00","horaFim":"18:00"},
    {"diaSemana":5,"horaInicio":"09:00","horaFim":"18:00"},
    {"diaSemana":6,"horaInicio":"09:00","horaFim":"18:00"}
  ]}'
```

## 3. Testar o painel do sócio (Fase 1)

1. Abra `http://localhost:5173/login`.
2. Entre com o telefone/senha cadastrados acima.
3. Deve redirecionar para `/painel` mostrando "Painel — Seu Nome".
4. Clique "Sair" — deve voltar para `/login`.
5. Tente acessar `http://localhost:5173/painel` deslogado — deve redirecionar sozinho
   para `/login`.

## 4. Testar o agendamento público (Fase 2)

1. Abra `http://localhost:5173/agendar` (ou clique "Agendar horário" na página inicial).
2. **Serviço**: escolha "Corte Simples".
3. **Barbeiro**: escolha o único listado.
4. **Data e horário**: escolha uma data (hoje ou futura) e um horário mostrado.
   - ⚠️ Limitação conhecida ainda não corrigida: se o dia estiver totalmente livre, só
     aparece **um** horário selecionável (o início do expediente), não vários ao longo do
     dia. Isso é um defeito real (granularidade), não um bug de teste seu.
5. **Seus dados**: preencha nome, telefone (qualquer um novo, ex.: `11988887777`) e uma
   senha com 8+ caracteres.
6. **Verificação**: o "envio" de WhatsApp é mock — o código de 6 dígitos aparece no
   terminal onde `npm run dev:api` está rodando, procure por uma linha assim:
   ```
   [WhatsApp mock] Para 11988887777: Seu código de verificação Silvério Barbearia é 123456. ...
   ```
   Digite esse código na tela.
7. **Revisão**: confira os dados, marque ou não o opt-in de mensagens automáticas, e
   confirme.
8. **Confirmação**: deve mostrar a tela final com os dados do agendamento. Se marcou o
   opt-in, uma segunda linha `[WhatsApp mock] ... [template=confirmacao_agendamento] ...`
   aparece no log da API.

### Testar o conflito de horário (409)

Repita o fluxo acima escolhendo **o mesmo barbeiro/data/horário** já usado no passo
anterior, com um telefone diferente. Ao confirmar, deve aparecer um toast vermelho
"Esse horário acabou de ser reservado..." no canto inferior direito, e a tela deve voltar
sozinha para a etapa de horário já com a lista atualizada (sem o horário que acabou de
ser ocupado).

## 5. Limpando os dados de teste

Não há endpoint de reset. Para recomeçar do zero, ou:
- delete as linhas de teste direto no painel do Neon (tabelas `usuarios`, `barbeiros`,
  `servicos`, `clientes`, `agendamentos`, `ocupacoes_barbeiro`, `disponibilidade_barbeiro`), ou
- crie um projeto Neon novo e repita a migração.

## 6. Encerrando

`Ctrl+C` nos dois terminais (`dev:api` e `dev:web`). O arquivo `apps/api/.dev.vars` fica
no seu disco (não é versionado no git — confirme com `git status` que ele nunca aparece).

import { Hono } from "hono";
import { criarDb } from "./db/client";
import { agendamentosRoutes } from "./modules/agendamentos/agendamentos.routes";
import { authRoutes } from "./modules/auth/auth.routes";
import { barbeirosRoutes } from "./modules/barbeiros/barbeiros.routes";
import { bloqueiosRoutes } from "./modules/bloqueios/bloqueios.routes";
import { servicosRoutes } from "./modules/servicos/servicos.routes";
import type { AppContexto } from "./shared/tipos";

const app = new Hono<AppContexto>();

// Cria uma conexão por requisição e garante que o Pool seja encerrado ao final —
// ver client.ts sobre a escolha de Pool (WebSocket) em vez do driver neon-http.
app.use("*", async (c, next) => {
  const db = criarDb(c.env.DATABASE_URL);
  c.set("db", db);
  c.set("usuarioId", null);
  try {
    await next();
  } finally {
    // `.catch` evita rejeição não tratada (ex.: pool que nunca chegou a conectar) —
    // isso não pode derrubar/alterar a resposta que já foi montada acima.
    c.executionCtx.waitUntil(db.$client.end().catch(() => {}));
  }
});

app.get("/api/saude", (c) => c.json({ ok: true }));

app.route("/api/auth", authRoutes);
app.route("/api/servicos", servicosRoutes);
app.route("/api/barbeiros", barbeirosRoutes);
app.route("/api/agendamentos", agendamentosRoutes);
app.route("/api/bloqueios", bloqueiosRoutes);

app.onError((erro, c) => {
  console.error(erro);
  return c.json({ erro: "Erro interno do servidor." }, 500);
});

app.notFound((c) => c.json({ erro: "Rota não encontrada." }, 404));

export default app;

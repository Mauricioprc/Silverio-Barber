import { Link } from "react-router-dom";

/** Placeholder da Fase 1 — só confirma que a rota pública funciona sem autenticação. */
export default function PaginaPublicaInicial() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Barbearia Silvério</h1>
      <p className="text-base-300">Agendamento online chega na Fase 2.</p>
      <Link to="/login" className="text-destaque-400 underline">
        Sou sócio, entrar
      </Link>
    </div>
  );
}

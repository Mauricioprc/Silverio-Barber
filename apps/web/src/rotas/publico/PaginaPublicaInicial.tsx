import { Link } from "react-router-dom";
import { Botao } from "../../componentes/Botao";

export default function PaginaPublicaInicial() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-2xl font-semibold">Barbearia Silvério</h1>
      <Link to="/agendar" className="w-full max-w-xs">
        <Botao className="w-full">Agendar horário</Botao>
      </Link>
      <Link to="/login" className="text-sm text-base-300 underline">
        Sou sócio, entrar
      </Link>
    </div>
  );
}

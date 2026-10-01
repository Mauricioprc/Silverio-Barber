import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./Input";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  rotulo: string;
};

/**
 * Campo de senha com alvo de mostrar/ocultar (44px, `aria-label`) — sempre `variante="clara"`
 * do `Input`. Usado nos formulários de Conta e acesso (alterar usuário, trocar senha).
 */
export function CampoSenha({ rotulo, id, className = "", ...resto }: Props) {
  const idGerado = useId();
  const inputId = id ?? idGerado;
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="relative">
      <Input
        variante="clara"
        rotulo={rotulo}
        id={inputId}
        type={visivel ? "text" : "password"}
        className={`pr-11 ${className}`}
        {...resto}
      />
      <button
        type="button"
        onClick={() => setVisivel((atual) => !atual)}
        aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visivel}
        className="absolute bottom-0 right-0 flex h-11 w-11 items-center justify-center text-text-muted transition-colors hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        {visivel ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
      </button>
    </div>
  );
}

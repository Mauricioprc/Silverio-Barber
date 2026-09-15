import { useEffect, useRef, useState } from "react";
import { useEnviarCodigoVerificacao, useConfirmarCodigoVerificacao, retryAfterDoErro } from "../hooks/useVerificacao";
import { mensagemHumana } from "../../../lib/mensagens-erro";
import { Input } from "../../../componentes/Input";
import { Botao } from "../../../componentes/Botao";

export function EtapaVerificacao({ onVerificado }: { onVerificado: () => void }) {
  const enviar = useEnviarCodigoVerificacao();
  const confirmar = useConfirmarCodigoVerificacao();
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [segundosParaReenviar, setSegundosParaReenviar] = useState(0);
  const jaEnviouPrimeiraVez = useRef(false);

  function enviarCodigo() {
    setErro(null);
    enviar.mutate(undefined, {
      onError: (erroCapturado) => {
        const retryAfter = retryAfterDoErro(erroCapturado);
        if (retryAfter !== null) {
          setSegundosParaReenviar(retryAfter);
        }
        setErro(mensagemHumana(erroCapturado));
      },
    });
  }

  useEffect(() => {
    if (!jaEnviouPrimeiraVez.current) {
      jaEnviouPrimeiraVez.current = true;
      enviarCodigo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (segundosParaReenviar <= 0) return;
    const id = setInterval(() => setSegundosParaReenviar((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [segundosParaReenviar]);

  function aoConfirmar() {
    setErro(null);
    confirmar.mutate(codigo, {
      onSuccess: () => onVerificado(),
      onError: (erroCapturado) => setErro(mensagemHumana(erroCapturado)),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-base-300">
        Enviamos um código de 6 dígitos por WhatsApp para o telefone informado.
      </p>
      <Input
        rotulo="Código"
        inputMode="numeric"
        autoFocus
        maxLength={6}
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
        erro={erro ?? undefined}
      />
      <Botao onClick={aoConfirmar} carregando={confirmar.isPending} disabled={codigo.length !== 6}>
        Confirmar código
      </Botao>
      <Botao
        type="button"
        variante="secundaria"
        onClick={enviarCodigo}
        disabled={segundosParaReenviar > 0 || enviar.isPending}
      >
        {segundosParaReenviar > 0 ? `Reenviar em ${segundosParaReenviar}s` : "Reenviar código"}
      </Botao>
    </div>
  );
}

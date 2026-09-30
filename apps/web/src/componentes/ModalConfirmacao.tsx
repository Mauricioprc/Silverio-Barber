import { Botao } from "./Botao";
import { Modal } from "./Modal";

/**
 * Diálogo de confirmação do redesenho claro (ver front-redesign-fase0-agenda.md)
 * para ações destrutivas — botão `perigo` nunca fica ao lado do botão positivo
 * primário, por isso o cancelar vem primeiro e em contorno.
 */
export function ModalConfirmacao({
  titulo,
  texto,
  aberto,
  onFechar,
  onConfirmar,
  rotuloConfirmar = "Confirmar",
  confirmando = false,
}: {
  titulo: string;
  texto: string;
  aberto: boolean;
  onFechar: () => void;
  onConfirmar: () => void;
  rotuloConfirmar?: string;
  confirmando?: boolean;
}) {
  return (
    <Modal titulo={titulo} aberto={aberto} onFechar={onFechar}>
      <p className="mb-6 text-sm text-text-muted">{texto}</p>
      <div className="flex flex-col gap-2">
        <Botao variante="contorno-novo" tamanho="lg" onClick={onFechar} disabled={confirmando}>
          Cancelar
        </Botao>
        <Botao variante="perigo" tamanho="lg" onClick={onConfirmar} carregando={confirmando}>
          {rotuloConfirmar}
        </Botao>
      </div>
    </Modal>
  );
}

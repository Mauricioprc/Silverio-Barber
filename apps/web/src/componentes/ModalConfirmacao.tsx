import { Botao } from "./Botao";
import { Modal } from "./Modal";

/**
 * Diálogo de confirmação do redesenho claro (ver front-redesign-fase0-agenda.md) para
 * ações destrutivas. Botões lado a lado, confirmar à direita (convenção: a ação que o
 * polegar bate por último, pra não confirmar sem querer ao rolar/tocar rápido).
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
      <div className="flex justify-end gap-2">
        <Botao variante="contorno-novo" tamanho="md" onClick={onFechar} disabled={confirmando}>
          Cancelar
        </Botao>
        <Botao variante="perigo" tamanho="md" onClick={onConfirmar} carregando={confirmando}>
          {rotuloConfirmar}
        </Botao>
      </div>
    </Modal>
  );
}

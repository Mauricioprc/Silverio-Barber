import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Toast = { id: number; mensagem: string; tipo: "sucesso" | "erro" };
type ToastContextValor = { mostrarToast: (mensagem: string, tipo?: Toast["tipo"]) => void };

const ToastContext = createContext<ToastContextValor | null>(null);

let proximoId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const mostrarToast = useCallback((mensagem: string, tipo: Toast["tipo"] = "sucesso") => {
    const id = proximoId++;
    setToasts((atual) => [...atual, { id, mensagem, tipo }]);
    setTimeout(() => {
      setToasts((atual) => atual.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`rounded px-4 py-3 text-sm shadow-lg ${
              toast.tipo === "erro" ? "bg-red-600 text-white" : "bg-destaque-500 text-base-900"
            }`}
          >
            {toast.mensagem}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const contexto = useContext(ToastContext);
  if (!contexto) {
    throw new Error("useToast precisa ser usado dentro de ToastProvider.");
  }
  return contexto;
}

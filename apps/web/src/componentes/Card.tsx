import { type HTMLAttributes, type KeyboardEvent } from "react";

/**
 * Quando recebe `onClick`, vira operável por teclado (`role="button"`, `tabIndex`,
 * Enter/Espaço) — sem isso, um `<div onClick>` é invisível pra quem navega só com
 * teclado (achado na revisão de acessibilidade da Fase 5, ver `ClientesPage.tsx`, que
 * usa `Card` como item de lista clicável).
 */
export function Card({ className = "", onClick, onKeyDown, ...resto }: HTMLAttributes<HTMLDivElement>) {
  const interativo = onClick !== undefined;

  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(evento);
    if (interativo && (evento.key === "Enter" || evento.key === " ")) {
      evento.preventDefault();
      (evento.currentTarget as HTMLDivElement).click();
    }
  }

  return (
    <div
      className={`rounded border border-base-700 bg-base-900 p-6 shadow-sm ${
        interativo ? "focus-visible:outline focus-visible:outline-2 focus-visible:outline-destaque-500" : ""
      } ${className}`}
      role={interativo ? "button" : undefined}
      tabIndex={interativo ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interativo ? aoTeclar : onKeyDown}
      {...resto}
    />
  );
}

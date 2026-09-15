import { forwardRef, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  rotulo: string;
  erro?: string;
};

export const Input = forwardRef<HTMLInputElement, Props>(({ rotulo, erro, id, className = "", ...resto }, ref) => {
  const inputId = id ?? rotulo.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm text-base-300">
        {rotulo}
      </label>
      <input
        id={inputId}
        ref={ref}
        className={`rounded border bg-base-700 px-3 py-2 text-base-50 outline-none focus:ring-2 focus:ring-destaque-500 ${
          erro ? "border-red-500" : "border-base-500"
        } ${className}`}
        aria-invalid={Boolean(erro)}
        {...resto}
      />
      {erro && <span className="text-sm text-red-400">{erro}</span>}
    </div>
  );
});

Input.displayName = "Input";

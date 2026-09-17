import { forwardRef, type SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & { rotulo: string };

export const Select = forwardRef<HTMLSelectElement, Props>(({ rotulo, id, className = "", children, ...resto }, ref) => {
  const selectId = id ?? rotulo.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className="text-sm text-base-300">
        {rotulo}
      </label>
      <select
        id={selectId}
        ref={ref}
        className={`rounded-sm border border-base-500 bg-base-700 px-3 py-2 text-base-50 outline-none transition-colors focus:border-destaque-500 focus:ring-1 focus:ring-destaque-500 ${className}`}
        {...resto}
      >
        {children}
      </select>
    </div>
  );
});

Select.displayName = "Select";

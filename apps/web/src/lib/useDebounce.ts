import { useEffect, useState } from "react";

/** Evita uma chamada de API por tecla digitada em campo de busca (ver documento de convenções). */
export function useDebounce<T>(valor: T, atrasoMs = 400): T {
  const [debounced, setDebounced] = useState(valor);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(valor), atrasoMs);
    return () => clearTimeout(id);
  }, [valor, atrasoMs]);

  return debounced;
}

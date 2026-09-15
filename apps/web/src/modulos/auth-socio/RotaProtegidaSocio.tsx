import { Navigate, Outlet } from "react-router-dom";
import { useAuthSocio } from "../../contextos/auth-socio-context";
import { Skeleton } from "../../componentes/Skeleton";

/**
 * Guard de UX (evita mostrar tela errada antes do redirect) — a autorização real
 * continua sendo sempre imposta pelo back-end (`exigirLogin`), nunca só por este guard.
 */
export function RotaProtegidaSocio() {
  const { socio, carregando } = useAuthSocio();

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!socio) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

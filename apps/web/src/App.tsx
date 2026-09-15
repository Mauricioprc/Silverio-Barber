import { lazy, Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "./lib/query-client";
import { AuthSocioProvider } from "./contextos/auth-socio-context";
import { AuthClienteProvider } from "./contextos/auth-cliente-context";
import { ToastProvider } from "./componentes/Toast";
import { Skeleton } from "./componentes/Skeleton";
import { RotaProtegidaSocio } from "./modulos/auth-socio/RotaProtegidaSocio";

// Code-splitting por área: quem só acessa a página pública de agendamento nunca baixa o
// bundle do painel interno (ver documento de convenções).
const PaginaPublicaInicial = lazy(() => import("./rotas/publico/PaginaPublicaInicial"));
const LoginSocioPage = lazy(() => import("./modulos/auth-socio/LoginSocioPage"));
const PainelInicial = lazy(() => import("./rotas/painel/PainelInicial"));

function CarregandoRota() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Skeleton className="h-8 w-48" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSocioProvider>
        <AuthClienteProvider>
          <ToastProvider>
            <BrowserRouter>
              <Suspense fallback={<CarregandoRota />}>
                <Routes>
                  <Route path="/" element={<PaginaPublicaInicial />} />
                  <Route path="/login" element={<LoginSocioPage />} />
                  <Route element={<RotaProtegidaSocio />}>
                    <Route path="/painel" element={<PainelInicial />} />
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ToastProvider>
        </AuthClienteProvider>
      </AuthSocioProvider>
    </QueryClientProvider>
  );
}

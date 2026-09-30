import { lazy, Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { queryClient } from "./lib/query-client";
import { AuthSocioProvider } from "./contextos/auth-socio-context";
import { AuthClienteProvider } from "./contextos/auth-cliente-context";
import { ToastProvider } from "./componentes/Toast";
import { Skeleton } from "./componentes/Skeleton";
import { RotaProtegidaSocio } from "./modulos/auth-socio/RotaProtegidaSocio";

// Code-splitting por área: quem só acessa a página pública de agendamento nunca baixa o
// bundle do painel interno (ver documento de convenções).
const AgendamentoPublicoPage = lazy(() => import("./modulos/agendamento-publico/AgendamentoPublicoPage"));
const LoginSocioPage = lazy(() => import("./modulos/auth-socio/LoginSocioPage"));
const PainelLayout = lazy(() => import("./modulos/painel/PainelLayout"));
const AgendaPage = lazy(() => import("./modulos/agenda/AgendaPage"));
const BarbeirosPage = lazy(() => import("./modulos/barbeiros/BarbeirosPage"));
const FinanceiroPage = lazy(() => import("./modulos/financeiro/FinanceiroPage"));
const ClientesPage = lazy(() => import("./modulos/clientes/ClientesPage"));
const ClienteDetalhePage = lazy(() => import("./modulos/clientes/ClienteDetalhePage"));
const ServicosPage = lazy(() => import("./modulos/servicos/ServicosPage"));
const BloqueiosPage = lazy(() => import("./modulos/agenda/BloqueiosPage"));
const MaisPage = lazy(() => import("./modulos/painel/MaisPage"));

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
                  {/* "/" é um redirecionamento temporário — no futuro uma landing estática
                      (fora desta SPA) ocupa esse caminho, por isso não criamos página aqui. */}
                  <Route path="/" element={<Navigate to="/agendar" replace />} />
                  <Route path="/agendar/*" element={<AgendamentoPublicoPage />} />
                  {/* Rota antiga do login de sócio — mantém redirect pra quem tiver o link salvo. */}
                  <Route path="/login" element={<Navigate to="/painel/login" replace />} />
                  <Route path="/painel/login" element={<LoginSocioPage />} />
                  <Route element={<RotaProtegidaSocio />}>
                    <Route path="/painel" element={<PainelLayout />}>
                      <Route index element={<AgendaPage />} />
                      <Route path="barbeiros" element={<BarbeirosPage />} />
                      <Route path="financeiro" element={<FinanceiroPage />} />
                      <Route path="clientes" element={<ClientesPage />} />
                      <Route path="clientes/:id" element={<ClienteDetalhePage />} />
                      <Route path="servicos" element={<ServicosPage />} />
                      <Route path="bloqueios" element={<BloqueiosPage />} />
                      <Route path="mais" element={<MaisPage />} />
                    </Route>
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

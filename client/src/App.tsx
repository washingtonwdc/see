import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminProvider } from "@/components/admin-provider";
import { AdminToggle } from "@/components/admin-toggle";
import { AdminDialog } from "@/components/admin-dialog";
import Home from "@/pages/home";
import SetoresList from "@/pages/setores-list";
import SetorDetail from "@/pages/setor-detail";
import ListaTelefonica from "@/pages/lista-telefonica";
import Sobre from "@/pages/sobre";
import AgendaPage from "@/pages/agenda";
import NotFound from "@/pages/not-found";
import { useAdmin } from "@/components/admin-provider";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

function AdminOnlyAgenda() {
  const { adminOpen, requireAdmin } = useAdmin();
  useEffect(() => {
    if (!adminOpen) {
      requireAdmin();
    }
  }, [adminOpen]);
  return adminOpen ? <AgendaPage /> : null;
}

function AdminOnlyListaTelefonica() {
  const { adminOpen, requireAdmin } = useAdmin();
  useEffect(() => {
    if (!adminOpen) {
      requireAdmin();
    }
  }, [adminOpen]);
  return adminOpen ? <ListaTelefonica /> : null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/setores" component={SetoresList} />
      <Route path="/setor/:idOrSlug" component={SetorDetail} />
      <Route path="/lista-telefonica" component={AdminOnlyListaTelefonica} />
      <Route path="/agenda" component={AdminOnlyAgenda} />
      <Route path="/sobre" component={Sobre} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };
  const [location, setLocation] = useLocation();
  useEffect(() => {
    const title = (() => {
      if (location.startsWith("/setores")) return "Buscar Setores | SEEPE";
      if (location.startsWith("/setor")) return "Detalhe do Setor | SEEPE";
      if (location.startsWith("/lista-telefonica")) return "Lista Telefônica | SEEPE";
      if (location.startsWith("/agenda")) return "Agenda | SEEPE";
      if (location.startsWith("/sobre")) return "Sobre | SEEPE";
      return "SEEPE - Sistema de Localização de Setores";
    })();
    document.title = title;
  }, [location]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey && k === "k") || k === "/") {
        e.preventDefault();
        setLocation("/setores");
        setTimeout(() => {
          const el = document.querySelector('[data-testid="input-search"]') as HTMLInputElement | null;
          el?.focus();
        }, 50);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setLocation]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <AdminProvider>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between gap-4 p-4 border-b bg-background">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <AdminToggle />
                    <AdminCountdownBadge />
                  </div>
                </header>
                <main className="flex-1 overflow-y-auto bg-background">
                  <ErrorBoundary>
                    <Router />
                  </ErrorBoundary>
                </main>
                {location.startsWith("/sobre") && <VersionFooter />}
                <AdminDialog />
              </div>
            </div>
            </AdminProvider>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function AdminCountdownBadge() {
  const { adminOpen, remainingMs } = useAdmin();
  const m = Math.floor((remainingMs || 0) / 60000);
  const s = Math.floor(((remainingMs || 0) % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const danger = remainingMs > 0 && remainingMs <= 60000;
  if (!adminOpen || remainingMs <= 0) return null;
  return (
    <Badge variant="secondary" className={danger ? "bg-destructive/10 text-destructive" : undefined}>
      <Shield className="h-3 w-3 mr-1" /> Admin {pad(m)}:{pad(s)}
    </Badge>
  );
}

function VersionFooter() {
  type VersionInfo = { version: string; env: string; serverStartedAt: string; totalSetores: number };
  const { data: versionInfo } = useQuery<VersionInfo>({
    queryKey: ["/api/version"],
    staleTime: 1000,
    refetchInterval: 15000,
  });
  type Stats = { totalSetores: number; totalBlocos: number; totalAndares: number; totalRamais: number };
  const { data: stats, error: statsError } = useQuery<Stats>({
    queryKey: ["/api/statistics"],
    staleTime: 1000,
    refetchInterval: 15000,
    retry: 0,
  });
  const [lastStatsSuccessAt, setLastStatsSuccessAt] = useState<number | null>(null);
  useEffect(() => {
    if (stats) setLastStatsSuccessAt(Date.now());
  }, [stats]);
  const formatRelative = (ts?: number | null) => {
    if (!ts) return "";
    const diffMs = Date.now() - ts;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "há segundos";
    if (diffMin === 1) return "há 1 minuto";
    if (diffMin < 60) return `há ${diffMin} minutos`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr === 1) return "há 1 hora";
    return `há ${diffHr} horas`;
  };
  const qc = useQueryClient();
  const envBadgeClass = versionInfo?.env === "production" ? "bg-destructive/10 text-destructive" : undefined;
  const envLabel = versionInfo?.env === "production" ? "Produção" : versionInfo?.env;
  useEffect(() => {
    const v = versionInfo?.version;
    if (!v) return;
    const prev = localStorage.getItem("app_version");
    if (prev && prev !== v) {
      toast({ title: "Aplicativo atualizado", description: `Versão ${v}` });
    }
    localStorage.setItem("app_version", v);
  }, [versionInfo?.version]);
  if (!versionInfo) return null;
  const containerClass = versionInfo.env === "production" ? "border-t border-destructive bg-destructive/5" : "border-t bg-muted/40";
  return (
    <footer className={containerClass}>
      <div className="mx-auto max-w-7xl px-4 py-2 flex flex-wrap items-center gap-3" data-testid="version-footer">
        <Badge variant="outline">Versão {versionInfo.version}</Badge>
        <Badge variant="outline" className={envBadgeClass}>Ambiente {envLabel}</Badge>
        <Badge variant="outline">Setores {versionInfo.totalSetores}</Badge>
        {stats && (
          <>
            <Badge variant="outline">Blocos {stats.totalBlocos}</Badge>
            <Badge variant="outline">Andares {stats.totalAndares}</Badge>
            <Badge variant="outline">Ramais {stats.totalRamais}</Badge>
          </>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {statsError ? (
                <Badge className="bg-red-600/15 text-red-700 dark:text-red-300" variant="secondary">Saúde Degradado</Badge>
              ) : (
                <Badge className="bg-green-600/15 text-green-700 dark:text-green-300" variant="secondary">
                  Saúde OK{lastStatsSuccessAt ? ` • ${new Date(lastStatsSuccessAt).toLocaleTimeString("pt-BR")} • ${formatRelative(lastStatsSuccessAt)}` : ""}
                </Badge>
              )}
            </TooltipTrigger>
            <TooltipContent>
              {statsError ? "Falha ao obter estatísticas" : "Servidor responde normalmente"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span className="text-xs text-muted-foreground">
          Iniciado {new Date(versionInfo.serverStartedAt).toLocaleString("pt-BR")}
        </span>
        <Button size="sm" variant="outline" onClick={() => {
          qc.invalidateQueries({ queryKey: ["/api/version"] });
          qc.invalidateQueries({ queryKey: ["/api/statistics"] });
        }}>Atualizar</Button>
      </div>
    </footer>
  );
}
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<Error | null>(null);
  const reset = () => setError(null);
  const Fallback = () => (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-2">Ocorreu um erro</h2>
      <p className="text-sm text-muted-foreground mb-4">Tente recarregar a página.</p>
      <Button variant="outline" onClick={() => { reset(); window.location.reload(); }}>Recarregar</Button>
    </div>
  );
  useEffect(() => {
    const handler = (event: ErrorEvent) => { setError(event.error || new Error(event.message)); };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);
  if (error) return <Fallback />;
  return children as any;
}

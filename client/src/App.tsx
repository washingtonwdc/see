import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
                  <Router />
                </main>
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

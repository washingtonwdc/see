import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Filter, AlertCircle } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { SetorCard } from "@/components/setor-card";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Setor } from "@shared/schema";
import { toast } from "@/hooks/use-toast";
import { useAdmin } from "@/components/admin-provider";
import { Footer } from "@/components/footer";

export default function SetoresList() {
  const { adminOpen, requireAdmin } = useAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBloco, setSelectedBloco] = useState<string>("all");
  const [selectedAndar, setSelectedAndar] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<{ nome: string; sigla: string; bloco: string; andar: string; email: string; observacoes: string; ramal_principal: string }>({
    nome: "",
    sigla: "",
    bloco: "",
    andar: "",
    email: "",
    observacoes: "",
    ramal_principal: "",
  });
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Initialize filters from URL query parameters
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const qb = params.get("bloco");
      const qa = params.get("andar");
      const qq = params.get("query");
      if (qb) setSelectedBloco(qb);
      if (qa) setSelectedAndar(qa);
      if (qq) setSearchQuery(qq);
    } catch {}
  }, []);

  // Fetch filter options from dedicated endpoints
  const { data: blocosList, isLoading: blocosLoading, isError: blocosError } = useQuery<string[]>({
    queryKey: ["/api/blocos"],
  });
  const { data: andaresList, isLoading: andaresLoading, isError: andaresError } = useQuery<string[]>({
    queryKey: ["/api/andares"],
  });
  const filtersLoading = blocosLoading || andaresLoading;
  const filtersError = blocosError || andaresError;

  // Build query parameters for backend search
  const hasFilters = searchQuery || selectedBloco !== "all" || selectedAndar !== "all";

  const queryParams = useMemo(() => {
    if (!hasFilters) return undefined;

    const params: Record<string, string> = {};
    if (searchQuery) params.query = searchQuery;
    if (selectedBloco !== "all") params.bloco = selectedBloco;
    if (selectedAndar !== "all") params.andar = selectedAndar;
    return params;
  }, [searchQuery, selectedBloco, selectedAndar, hasFilters]);

  // Fetch filtered or all setores from backend (different query key)
  const { data: displaySetores, isLoading } = useQuery<Setor[]>({
    queryKey: hasFilters
      ? ["/api/setores", queryParams]
      : ["/api/setores"],
  });

  // Optional: keep URL in sync with current filters for sharable links
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("query", searchQuery);
    if (selectedBloco !== "all") params.set("bloco", selectedBloco);
    if (selectedAndar !== "all") params.set("andar", selectedAndar);
    const qs = params.toString();
    navigate(qs ? `/setores?${qs}` : "/setores");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedBloco, selectedAndar]);

  // Use backend-provided filter lists, fallback to empty arrays
  const blocos = useMemo(() => {
    return Array.isArray(blocosList) ? blocosList : [];
  }, [blocosList]);
  const andares = useMemo(() => {
    return Array.isArray(andaresList) ? andaresList : [];
  }, [andaresList]);

  const activeFiltersCount = [
    selectedBloco !== "all",
    selectedAndar !== "all",
  ].filter(Boolean).length;

  const [masterPassword, setMasterPassword] = useState("");

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedBloco("all");
    setSelectedAndar("all");
  };

  const handleImportJSON = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!Array.isArray(data)) throw new Error("JSON deve conter um array");
        const resp = await fetch(`/api/setores/import?mode=replace`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(masterPassword ? { "X-Master-Password": masterPassword } : {}) },
          body: JSON.stringify(data),
        });
        if (!resp.ok) throw new Error(await resp.text());
        toast({ title: "Setores importados", description: "Dados carregados com sucesso" });
        // Force refetch
        window.location.reload();
      } catch (e: unknown) {
        toast({ title: "Falha ao importar JSON", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
      }
    };
    input.click();
  };

  const handleImportCSV = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const resp = await fetch(`/api/setores/import-csv?mode=replace`, {
          method: "POST",
          headers: { "Content-Type": "text/csv", ...(masterPassword ? { "X-Master-Password": masterPassword } : {}) },
          body: text,
        });
        if (!resp.ok) throw new Error(await resp.text());
        toast({ title: "Setores importados", description: "CSV carregado com sucesso" });
        window.location.reload();
      } catch (e: unknown) {
        toast({ title: "Falha ao importar CSV", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
      }
    };
    input.click();
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportJSON = async () => {
    try {
      setIsExporting(true);
      const resp = await fetch(`/api/setores/export?format=json`, { headers: { ...(masterPassword ? { "X-Master-Password": masterPassword } : {}) } });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const filename = `setores_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      downloadFile(blob, filename);
      toast({ title: "Exportado", description: "JSON baixado" });
    } catch (e: unknown) {
      toast({ title: "Falha ao exportar JSON", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const resp = await fetch(`/api/setores/export?format=csv`, { headers: { ...(masterPassword ? { "X-Master-Password": masterPassword } : {}) } });
      if (!resp.ok) throw new Error(await resp.text());
      const text = await resp.text();
      const blob = new Blob([text], { type: "text/csv" });
      const filename = `setores_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
      downloadFile(blob, filename);
      toast({ title: "Exportado", description: "CSV baixado" });
    } catch (e: unknown) {
      toast({ title: "Falha ao exportar CSV", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/setores`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(masterPassword ? { "X-Master-Password": masterPassword } : {}) },
        body: JSON.stringify({ ...createForm, ...(masterPassword ? { master_password: masterPassword } : {}) }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (newSetor) => {
      toast({ title: "Setor criado", description: `\"${newSetor.nome}\" foi adicionado.` });
      setIsCreating(false);
      // refresh lists
      queryClient.invalidateQueries({ queryKey: ["/api/setores"] });
      navigate(`/setor/${newSetor.id}`);
    },
    onError: (e: Error) => {
      toast({ title: "Falha ao criar setor", description: e.message, variant: "destructive" });
    },
  });

  return (
    <>
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Buscar Setores</h1>
            <p className="text-muted-foreground">
              Encontre setores por nome, sigla, bloco, andar ou responsável
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-8 space-y-4">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />

            <div className="flex items-center gap-4 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-toggle-filters"
              >
                <Filter className="mr-2 h-4 w-4" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>

              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  data-testid="button-clear-filters"
                >
                  Limpar filtros
                </Button>
              )}
            </div>

            {showFilters && (
              <Card>
                <CardContent className="p-6">
                  {filtersError && (
                    <div className="mb-4 flex items-center gap-2 text-sm text-destructive" data-testid="text-filters-error">
                      <AlertCircle className="h-4 w-4" />
                      Falha ao carregar opções de filtros. Tente novamente mais tarde.
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Bloco</label>
                      <Select value={selectedBloco} onValueChange={setSelectedBloco}>
                        <SelectTrigger data-testid="select-bloco" disabled={filtersLoading || filtersError}>
                          <SelectValue placeholder={blocosLoading ? "Carregando..." : "Todos os blocos"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os blocos</SelectItem>
                          {blocos.map(bloco => (
                            <SelectItem key={bloco} value={bloco}>
                              {bloco}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Andar</label>
                      <Select value={selectedAndar} onValueChange={setSelectedAndar}>
                        <SelectTrigger data-testid="select-andar" disabled={filtersLoading || filtersError}>
                          <SelectValue placeholder={andaresLoading ? "Carregando..." : "Todos os andares"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os andares</SelectItem>
                          {andares.map(andar => (
                            <SelectItem key={andar} value={andar}>
                              {andar}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Results */}
          {isLoading ? (
            <LoadingState />
          ) : displaySetores && displaySetores.length > 0 ? (
            <>
              {adminOpen && (
                <div className="mb-4 flex items-center gap-2 flex-wrap">
                  <Button variant="secondary" size="sm" onClick={async () => { const ok = await requireAdmin(); if (!ok) return; await handleImportJSON(); }}>Importar JSON</Button>
                  <Button variant="secondary" size="sm" onClick={async () => { const ok = await requireAdmin(); if (!ok) return; await handleImportCSV(); }}>Importar CSV</Button>
                  <Button variant="outline" size="sm" onClick={async () => { const ok = await requireAdmin(); if (!ok) return; await handleExportJSON(); }} disabled={isExporting}>
                    {isExporting ? "Exportando..." : "Exportar JSON"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={async () => { const ok = await requireAdmin(); if (!ok) return; await handleExportCSV(); }} disabled={isExporting}>
                    {isExporting ? "Exportando..." : "Exportar CSV"}
                  </Button>
                  <Button variant="default" size="sm" onClick={async () => { const ok = await requireAdmin(); if (!ok) return; setIsCreating(true); }}>Novo Setor</Button>
                </div>
              )}
              <div className="mb-4">
                <p className="text-sm text-muted-foreground" data-testid="text-results-count">
                  {displaySetores.length} {displaySetores.length === 1 ? 'setor encontrado' : 'setores encontrados'}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {displaySetores.map(setor => (
                  <SetorCard key={setor.id} setor={setor} />
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              icon="search"
              title="Nenhum setor encontrado"
              description="Tente ajustar os filtros ou buscar por outros termos."
              actionLabel={activeFiltersCount > 0 || searchQuery ? "Limpar filtros" : undefined}
              onAction={activeFiltersCount > 0 || searchQuery ? clearFilters : undefined}
            />
          )}
        </div >
      </div >

      {/* Create Setor Dialog */}
      < Dialog open={isCreating} onOpenChange={setIsCreating} >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Setor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="novo-nome">Nome</label>
                <Input id="novo-nome" value={createForm.nome} onChange={(e) => setCreateForm({ ...createForm, nome: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="novo-sigla">Sigla</label>
                <Input id="novo-sigla" value={createForm.sigla} onChange={(e) => setCreateForm({ ...createForm, sigla: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="novo-bloco">Bloco</label>
                <Input id="novo-bloco" value={createForm.bloco} onChange={(e) => setCreateForm({ ...createForm, bloco: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="novo-andar">Andar</label>
                <Input id="novo-andar" value={createForm.andar} onChange={(e) => setCreateForm({ ...createForm, andar: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="novo-email">E-mail</label>
              <Input id="novo-email" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="novo-observacoes">Observações</label>
              <Input id="novo-observacoes" value={createForm.observacoes} onChange={(e) => setCreateForm({ ...createForm, observacoes: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="novo-ramal">Ramal principal</label>
              <Input id="novo-ramal" value={createForm.ramal_principal} onChange={(e) => setCreateForm({ ...createForm, ramal_principal: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancelar</Button>
            <Button onClick={async () => { const ok = await requireAdmin(); if (!ok) return; createMutation.mutate(); }} disabled={createMutation.isPending || !createForm.nome || !createForm.sigla}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >
      <Footer />
    </>
  );
}

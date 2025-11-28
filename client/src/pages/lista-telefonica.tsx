import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePhoneDirectory, DirectoryEntry } from "@/hooks/use-phone-directory";
import { DirectoryFilters } from "@/components/phone-directory/directory-filters";
import { DirectoryTable } from "@/components/phone-directory/directory-table";
import { DirectoryActions } from "@/components/phone-directory/directory-actions";
import { DirectoryDialogs } from "@/components/phone-directory/directory-dialogs";
import { EmptyState } from "@/components/empty-state";
import { Building2 } from "lucide-react";
import { Footer } from "@/components/footer";
import { ContactShareButtons } from "@/components/contact-share-buttons"; // new
import { QRCodeCanvas } from "qrcode.react"; // QR code component
import { toast } from "@/hooks/use-toast"; // toast for copy feedback
import { useDebounce } from "@/hooks/use-debounce";
import { BackToTop } from "@/components/back-to-top";

export default function ListaTelefonica() {
  const {
    setores,
    blocos,
    andares,
    responsaveis,
    emails,
    isLoading,
    searchQuery,
    setSearchQuery,
    sortField,
    sortDirection,
    toggleSort,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    currentEntries,
    filteredAndSortedEntries,
    selectedBloco,
    setSelectedBloco,
    selectedAndar,
    setSelectedAndar,
    selectedResponsavel,
    setSelectedResponsavel,
    selectedEmail,
    setSelectedEmail,
    favoritesFirst,
    setFavoritesFirst,
    favoritesOnly,
    setFavoritesOnly,
    accessFirst,
    setAccessFirst,
    toggleFavoriteMutation,
    updatePhoneMutation,
    addContactMutation,
    removePhoneMutation,
    adminOpen,
    requireAdmin
  } = usePhoneDirectory();

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{ slug: string; ramal: string; setorNome: string } | null>(null);
  const [editPhone, setEditPhone] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<DirectoryEntry | null>(null); // State for selected entry for share/QR

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debouncedSearch = useDebounce(localSearch, 300);

  useEffect(() => {
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch, setSearchQuery]);

  // Sync local search if external search changes (e.g. clear filters)
  useEffect(() => {
    if (searchQuery !== debouncedSearch) {
      setLocalSearch(searchQuery);
    }
  }, [searchQuery]);

  // Keyboard shortcut: focus search when Ctrl+K pressed
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "k") {
        const searchInput = document.getElementById("search-setor");
        searchInput?.focus();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleExportCSV = (data: DirectoryEntry[]) => {
    const csvContent = [
      ["Setor", "Sigla", "Bloco", "Andar", "Ramal", "Telefone", "Email", "Responsável"],
      ...data.map(e => {
        const setor = setores?.find(s => s.slug === e.slug);
        const resp = setor?.responsaveis?.map(r => r.nome).join(", ") || "";
        return [
          `"${e.setor}"`,
          `"${e.sigla}"`,
          `"${e.bloco}"`,
          `"${e.andar}"`,
          `"${e.ramal}"`,
          `"${e.telefone}"`,
          `"${e.email}"`,
          `"${resp}"`
        ];
      })
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "lista_telefonica.csv";
    link.click();
  };

  const handleAddContact = async (data: { slug: string; ramal: string; telefone: string; email: string }) => {
    await addContactMutation.mutateAsync(data);
  };

  const handleEditContact = (slug: string, ramal: string, setorNome: string, telefone: string) => {
    setEditTarget({ slug, ramal, setorNome });
    setEditPhone(telefone);
    setEditOpen(true);
  };

  const handleSaveEdit = async (slug: string, ramal: string, phone: string) => {
    await updatePhoneMutation.mutateAsync({ slug, ramal, phone });
  };

  const handleRemoveContact = async (slug: string, ramal: string) => {
    if (confirm("Tem certeza que deseja remover este telefone?")) {
      await removePhoneMutation.mutateAsync({ slug, ramal });
    }
  };

  const handleCopyPhone = (entry: DirectoryEntry) => {
    navigator.clipboard.writeText(entry.telefone);
    toast({
      title: "Copiado!",
      description: `${entry.setor} – ${entry.telefone} copiado para a área de transferência.`,
      variant: "success",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-[1600px]">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lista Telefônica</h1>
            <p className="text-muted-foreground mt-1">
              Encontre ramais, telefones e e-mails dos setores.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Quick‑win: Share & QR */}
            {selectedEntry && (
              <div className="flex items-center gap-2">
                <ContactShareButtons
                  nome={selectedEntry.nome}
                  telefone={selectedEntry.telefone}
                  email={selectedEntry.email}
                />
                <QRCodeCanvas
                  value={selectedEntry.telefone}
                  size={96}
                  level="H"
                  includeMargin={true}
                />
              </div>
            )}
            <DirectoryActions
              filteredEntries={filteredAndSortedEntries}
              currentEntries={currentEntries}
              onExportCSV={handleExportCSV}
              onAddContact={() => setAddOpen(true)}
              adminOpen={adminOpen}
              requireAdmin={requireAdmin}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Diretório de Contatos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DirectoryFilters
              searchQuery={localSearch}
              onSearchChange={setLocalSearch}
              blocos={blocos}
              andares={andares}
              responsaveis={responsaveis}
              emails={emails}
              selectedBloco={selectedBloco}
              onSelectedBlocoChange={setSelectedBloco}
              selectedAndar={selectedAndar}
              onSelectedAndarChange={setSelectedAndar}
              selectedResponsavel={selectedResponsavel}
              onSelectedResponsavelChange={setSelectedResponsavel}
              selectedEmail={selectedEmail}
              onSelectedEmailChange={setSelectedEmail}
              searchInputId="search-setor" // Added ID for keyboard shortcut
            />

            {isLoading ? (
              <div className="space-y-2">
                <div className="h-10 bg-muted animate-pulse rounded" />
                <div className="h-10 bg-muted animate-pulse rounded" />
                <div className="h-10 bg-muted animate-pulse rounded" />
              </div>
            ) : filteredAndSortedEntries.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="Nenhum contato encontrado"
                description={searchQuery ? "Tente buscar com outros termos." : "Não há contatos cadastrados."}
              />
            ) : (
              <DirectoryTable
                entries={currentEntries}
                totalEntries={filteredAndSortedEntries.length}
                page={page}
                pageSize={pageSize}
                totalPages={totalPages}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={toggleSort}
                favoritesFirst={favoritesFirst}
                onFavoritesFirstChange={setFavoritesFirst}
                favoritesOnly={favoritesOnly}
                onFavoritesOnlyChange={setFavoritesOnly}
                accessFirst={accessFirst}
                onAccessFirstChange={setAccessFirst}
                searchQuery={searchQuery}
                onToggleFavorite={(slug, numero, isFav) => toggleFavoriteMutation.mutate({ slug, numero, favorite: isFav })}
                onEdit={handleEditContact}
                onRemove={handleRemoveContact}
                adminOpen={adminOpen}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <DirectoryDialogs
        addOpen={addOpen}
        setAddOpen={setAddOpen}
        editOpen={editOpen}
        setEditOpen={setEditOpen}
        editTarget={editTarget}
        editPhone={editPhone}
        setores={setores}
        onAdd={handleAddContact}
        onSaveEdit={handleSaveEdit}
      />
      <Footer />
      <BackToTop />
    </div>
  );
}

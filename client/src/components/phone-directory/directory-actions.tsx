import { Button } from "@/components/ui/button";
import { DirectoryEntry } from "@/hooks/use-phone-directory";

interface DirectoryActionsProps {
    filteredEntries: DirectoryEntry[];
    currentEntries: DirectoryEntry[];
    onExportCSV: (entries: DirectoryEntry[]) => void;
    onExportJSON: (entries: DirectoryEntry[]) => void;
    onAddContact: () => void;
    adminOpen: boolean;
    requireAdmin: () => Promise<boolean>;
}

export function DirectoryActions({
    filteredEntries,
    currentEntries,
    onExportCSV,
    onExportJSON,
    onAddContact,
    adminOpen,
    requireAdmin
}: DirectoryActionsProps) {
    if (!adminOpen) return null;

    return (
        <div className="flex items-center gap-2">
            <Button onClick={async () => { const ok = await requireAdmin(); if (!ok) return; onExportCSV(filteredEntries); }} variant="outline" size="sm" data-testid="button-export-csv-all">
                Exportar CSV (filtrados)
            </Button>
            <Button onClick={async () => { const ok = await requireAdmin(); if (!ok) return; onExportCSV(currentEntries); }} variant="outline" size="sm" data-testid="button-export-csv-page">
                Exportar CSV (página)
            </Button>
            <Button onClick={async () => { const ok = await requireAdmin(); if (!ok) return; onExportJSON(filteredEntries); }} variant="outline" size="sm" data-testid="button-export-json-all">
                Exportar JSON (filtrados)
            </Button>
            <Button onClick={async () => { const ok = await requireAdmin(); if (!ok) return; onExportJSON(currentEntries); }} variant="outline" size="sm" data-testid="button-export-json-page">
                Exportar JSON (página)
            </Button>
            <Button onClick={async () => { const ok = await requireAdmin(); if (!ok) return; onAddContact(); }} size="sm" data-testid="button-adicionar-contato">
                Adicionar contato
            </Button>
        </div>
    );
}

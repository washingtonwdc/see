import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import { AgendaItem } from "@/hooks/use-agenda";
import { formatEndTime, parseDateTime, endDateTime } from "./utils";
import { isValidDate, sanitizeString } from "@/utils/validators";

interface AgendaExportProps {
    items: AgendaItem[];
    filteredItems: AgendaItem[];
    onImport: (items: AgendaItem[]) => void;
}

export function AgendaExport({ items, filteredItems, onImport }: AgendaExportProps) {
    const [exportPdfOpen, setExportPdfOpen] = useState(false);
    const [exportSelection, setExportSelection] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(false);

    // Numbered list for PDF export
    const numberedList = new Map<string, number>();
    filteredItems.forEach((it, idx) => numberedList.set(it.id, idx + 1));

    const openExportPdf = () => {
        const initial: Record<string, boolean> = {};
        for (const it of filteredItems) initial[it.id] = true;
        setExportSelection(initial);
        setExportPdfOpen(true);
    };

    const toggleSelectAll = (value: boolean) => {
        const next: Record<string, boolean> = {};
        for (const it of filteredItems) next[it.id] = value;
        setExportSelection(next);
    };

    const generatePdf = () => {
        const selected = filteredItems.filter((it) => exportSelection[it.id]);
        if (selected.length === 0) {
            toast({ title: "Selecione ao menos um item" });
            return;
        }
        const doc = new jsPDF({ unit: "pt", format: "a4" });
        const margin = 40;
        let y = margin;
        doc.setFontSize(16);
        doc.text("Agenda - Exportação", margin, y);
        y += 24;
        doc.setFontSize(11);
        const fmtLine = (it: AgendaItem) => {
            const num = numberedList.get(it.id) || "";
            const end = it.hora && it.duracao ? ` – ${formatEndTime(it)}` : "";
            const cat = it.categoria ? ` [${it.categoria}]` : "";
            const status = it.concluido ? " (Concluído)" : "";
            return `#${num} ${it.titulo}${cat}${status}\n${it.data}${it.hora ? ` ${it.hora}${end}` : ""}${it.notas ? `\nNotas: ${it.notas}` : ""}`;
        };
        for (const it of selected) {
            const lines = doc.splitTextToSize(fmtLine(it), 515);
            if (y + lines.length * 14 + 8 > doc.internal.pageSize.getHeight() - margin) {
                doc.addPage();
                y = margin;
            }
            doc.text(lines, margin, y);
            y += lines.length * 14 + 14;
        }
        const fname = `agenda-${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(fname);
        setExportPdfOpen(false);
        toast({ title: "PDF exportado" });
    };

    const handleImportJSON = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,application/json";
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;

            setIsLoading(true);
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                if (!Array.isArray(data)) throw new Error("JSON inválido: esperado array");

                const toImport: AgendaItem[] = [];
                const errors: string[] = [];

                for (let idx = 0; idx < data.length; idx++) {
                    const raw = data[idx];
                    try {
                        const data = String(raw.data || "").trim();
                        if (!data) {
                            errors.push(`Item ${idx + 1}: data inválida`);
                            continue;
                        }

                        if (!isValidDate(data)) {
                            errors.push(`Item ${idx + 1}: formato de data inválido (use YYYY-MM-DD)`);
                            continue;
                        }

                        const i: AgendaItem = {
                            id: typeof raw.id === "string" && raw.id ? raw.id : crypto.randomUUID(),
                            titulo: sanitizeString(String(raw.titulo || "Sem título")),
                            data: data,
                            hora: raw.hora ? String(raw.hora).trim() : undefined,
                            notas: raw.notas ? sanitizeString(String(raw.notas)) : undefined,
                            criadoEm: String(raw.criadoEm || new Date().toISOString()),
                            concluido: !!raw.concluido,
                            duracao: raw.duracao != null && !isNaN(Number(raw.duracao)) ? Number(raw.duracao) : undefined,
                            categoria: raw.categoria ? sanitizeString(String(raw.categoria)) : undefined,
                        };
                        toImport.push(i);
                    } catch (itemErr: unknown) {
                        errors.push(`Item ${idx + 1}: ${itemErr instanceof Error ? itemErr.message : String(itemErr)}`);
                    }
                }

                onImport(toImport);

                const message = toImport.length > 0
                    ? `${toImport.length} ${toImport.length === 1 ? 'item importado' : 'itens importados'}`
                    : "Nenhum item válido encontrado";

                const errorMsg = errors.length > 0 ? `\n${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}` : "";

                toast({
                    title: "Importação concluída",
                    description: message + errorMsg,
                    variant: errors.length > 0 ? "destructive" : "default"
                });
            } catch (err: unknown) {
                toast({
                    title: "Falha ao importar JSON",
                    description: err instanceof Error ? err.message : String(err),
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        };
        input.click();
    };

    function parseCsv(text: string): Record<string, string>[] {
        const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim().length > 0);
        if (lines.length === 0) return [];
        const headers = lines[0].split(",").map((h) => h.replace(/^\"|\"$/g, ""));
        const rows: Record<string, string>[] = [];
        for (let li = 1; li < lines.length; li++) {
            const row: string[] = [];
            const s = lines[li];
            let i = 0;
            while (i < s.length) {
                if (s[i] === '"') {
                    i++;
                    let val = "";
                    while (i < s.length) {
                        if (s[i] === '"' && s[i + 1] === '"') { val += '"'; i += 2; continue; }
                        if (s[i] === '"') { i++; break; }
                        val += s[i++];
                    }
                    row.push(val);
                    if (s[i] === ',') i++;
                } else {
                    let j = i;
                    while (j < s.length && s[j] !== ',') j++;
                    row.push(s.slice(i, j));
                    i = j + 1;
                }
            }
            const obj: Record<string, string> = {};
            headers.forEach((h, idx) => { obj[h] = row[idx] ?? ""; });
            rows.push(obj);
        }
        return rows;
    }

    const handleImportCSV = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".csv,text/csv";
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;

            setIsLoading(true);
            try {
                const text = await file.text();
                const rows = parseCsv(text);
                const toImport: AgendaItem[] = [];
                const errors: string[] = [];

                for (let idx = 0; idx < rows.length; idx++) {
                    const r = rows[idx];
                    try {
                        const data = (r.data || "").trim();
                        if (!data) {
                            errors.push(`Linha ${idx + 2}: data ausente`);
                            continue;
                        }

                        if (!isValidDate(data)) {
                            errors.push(`Linha ${idx + 2}: formato de data inválido`);
                            continue;
                        }

                        const id = r.id && r.id.trim() ? r.id.trim() : crypto.randomUUID();
                        const titulo = sanitizeString(r.titulo || "Sem título");
                        const hora = r.hora ? r.hora.trim() : undefined;
                        const notas = r.notas ? sanitizeString(r.notas) : undefined;
                        const criadoEm = r.criadoEm ? r.criadoEm : new Date().toISOString();
                        const concluido = r.concluido ? /^(true|1|sim)$/i.test(r.concluido) : false;
                        const duracao = r.duracao && !isNaN(Number(r.duracao)) ? Number(r.duracao) : undefined;
                        const categoria = r.categoria ? sanitizeString(r.categoria) : undefined;

                        toImport.push({ id, titulo, data, hora, notas, criadoEm, concluido, duracao, categoria });
                    } catch (itemErr: unknown) {
                        errors.push(`Linha ${idx + 2}: ${itemErr instanceof Error ? itemErr.message : String(itemErr)}`);
                    }
                }

                onImport(toImport);

                const message = toImport.length > 0
                    ? `${toImport.length} ${toImport.length === 1 ? 'item importado' : 'itens importados'}`
                    : "Nenhum item válido encontrado";

                const errorMsg = errors.length > 0 ? `\n${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}` : "";

                toast({
                    title: "Importação concluída",
                    description: message + errorMsg,
                    variant: errors.length > 0 ? "destructive" : "default"
                });
            } catch (err: unknown) {
                toast({
                    title: "Falha ao importar CSV",
                    description: err instanceof Error ? err.message : String(err),
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        };
        input.click();
    };

    return (
        <>
            <div className="mb-6 flex items-center justify-end gap-2 flex-wrap">
                <Button variant="default" onClick={handleImportJSON} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Importar JSON
                </Button>
                <Button variant="default" onClick={handleImportCSV} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Importar CSV
                </Button>
                <Button
                    variant="outline"
                    onClick={() => {
                        const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `agenda-${new Date().toISOString().slice(0, 10)}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast({ title: "Agenda exportada" });
                    }}
                >Exportar JSON</Button>
                <Button
                    variant="outline"
                    onClick={() => {
                        const header = ["id", "titulo", "data", "hora", "duracao", "categoria", "notas", "concluido", "criadoEm"];
                        const rows = items.map(i => [
                            i.id,
                            i.titulo.replace(/\"/g, '"'),
                            i.data,
                            i.hora || "",
                            String(i.duracao ?? ""),
                            i.categoria || "",
                            (i.notas || "").replace(/\"/g, '"'),
                            String(!!i.concluido),
                            i.criadoEm
                        ]);
                        const csv = [header.join(","), ...rows.map(r => r.map(f => `"${String(f).replace(/"/g, '"')}"`).join(","))].join("\n");
                        const blob = new Blob([csv], { type: "text/csv" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `agenda-${new Date().toISOString().slice(0, 10)}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast({ title: "CSV exportado" });
                    }}
                >Exportar CSV</Button>
                <Button
                    variant="outline"
                    onClick={() => {
                        const lines: string[] = [];
                        lines.push("BEGIN:VCALENDAR");
                        lines.push("VERSION:2.0");
                        lines.push("PRODID:-//SEE Agenda//PT-BR");
                        for (const i of items) {
                            lines.push("BEGIN:VEVENT");
                            const uid = i.id;
                            lines.push(`UID:${uid}`);
                            const dtstamp = new Date(i.criadoEm);
                            lines.push(`DTSTAMP:${dtstamp.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
                            if (i.hora) {
                                const start = parseDateTime(i.data, i.hora)!;
                                const end = endDateTime(i)!;
                                const fmt = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;
                                lines.push(`DTSTART:${fmt(start)}`);
                                lines.push(`DTEND:${fmt(end)}`);
                            } else {
                                const d = new Date(`${i.data}T00:00:00`);
                                const fmtDate = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
                                lines.push(`DTSTART;VALUE=DATE:${fmtDate}`);
                            }
                            lines.push(`SUMMARY:${i.titulo}`);
                            if (i.notas) lines.push(`DESCRIPTION:${i.notas}`);
                            lines.push("END:VEVENT");
                        }
                        lines.push("END:VCALENDAR");
                        const ics = lines.join("\r\n");
                        const blob = new Blob([ics], { type: "text/calendar" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `agenda-${new Date().toISOString().slice(0, 10)}.ics`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast({ title: "iCal exportado" });
                    }}
                >Exportar iCal</Button>
                <Button variant="default" onClick={openExportPdf}>Exportar PDF</Button>
            </div>

            <Dialog open={exportPdfOpen} onOpenChange={setExportPdfOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Exportar PDF</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">Selecione os itens visíveis para incluir</div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => toggleSelectAll(true)}>Selecionar todos</Button>
                                <Button variant="outline" size="sm" onClick={() => toggleSelectAll(false)}>Limpar</Button>
                            </div>
                        </div>
                        <div className="max-h-[300px] overflow-auto rounded border p-3">
                            <div className="space-y-2">
                                {filteredItems.map((it) => (
                                    <label key={it.id} className="flex items-center gap-3 text-sm">
                                        <Checkbox
                                            checked={!!exportSelection[it.id]}
                                            onCheckedChange={(v) => setExportSelection((prev) => ({ ...prev, [it.id]: !!v }))}
                                            aria-label={`Selecionar #${numberedList.get(it.id)}`}
                                        />
                                        <span className="font-mono">#{String(numberedList.get(it.id)).padStart(2, "0")}</span>
                                        <span className="flex-1 truncate">{it.titulo}</span>
                                        <span className="text-muted-foreground">{it.data}{it.hora ? ` ${it.hora}` : ""}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setExportPdfOpen(false)}>Cancelar</Button>
                        <Button onClick={generatePdf}>Exportar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

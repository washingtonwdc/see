import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { ArrowUpDown, Star, Filter, BarChart3, Copy, Phone, Mail, Building2, Lock } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { isMobilePhoneBR } from "./utils";
import { Switch } from "@/components/ui/switch";
import { DirectoryEntry, SortField, SortDirection } from "@/hooks/use-phone-directory";
import { toast } from "@/hooks/use-toast";

interface DirectoryTableProps {
    entries: DirectoryEntry[];
    totalEntries: number;
    page: number;
    pageSize: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    sortField: SortField;
    sortDirection: SortDirection;
    onSort: (field: SortField) => void;
    favoritesFirst: boolean;
    onFavoritesFirstChange: (value: boolean) => void;
    favoritesOnly: boolean;
    onFavoritesOnlyChange: (value: boolean) => void;
    accessFirst: boolean;
    onAccessFirstChange: (value: boolean) => void;
    searchQuery: string;
    onToggleFavorite: (slug: string, numero: string, isFav: boolean) => void;
    onEdit?: (slug: string, ramal: string, setorNome: string, telefone: string) => void;
    onRemove?: (slug: string, ramal: string) => void;
    adminOpen: boolean;
    onRequireAdmin?: () => Promise<boolean> | boolean;
}

export function DirectoryTable({
    entries,
    totalEntries,
    page,
    pageSize,
    totalPages,
    onPageChange,
    onPageSizeChange,
    sortField,
    sortDirection,
    onSort,
    favoritesFirst,
    onFavoritesFirstChange,
    favoritesOnly,
    onFavoritesOnlyChange,
    accessFirst,
    onAccessFirstChange,
    searchQuery,
    onToggleFavorite,
    onEdit,
    onRemove,
    adminOpen,
    onRequireAdmin
}: DirectoryTableProps) {
    const useVirtual = totalEntries > 400;
    const rowHeight = 64;
    const viewportHeight = 560;
    const [virtualScrollTop, setVirtualScrollTop] = useState(0);
    const visibleCount = Math.ceil(viewportHeight / rowHeight) + 4;
    const startIndex = useVirtual ? Math.max(0, Math.floor(virtualScrollTop / rowHeight) - 2) : 0;
    const endIndex = useVirtual ? Math.min(entries.length, startIndex + visibleCount) : entries.length;

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
        return <ArrowUpDown className="ml-2 h-4 w-4" />;
    };

    const highlight = (text: string) => {
        const q = searchQuery.trim();
        if (!q) return text;
        const idx = text.toLowerCase().indexOf(q.toLowerCase());
        if (idx === -1) return text;
        const before = text.slice(0, idx);
        const match = text.slice(idx, idx + q.length);
        const after = text.slice(idx + q.length);
        return (
            <span>
                {before}
                <span className="bg-yellow-200">{match}</span>
                {after}
            </span>
        );
    };

    const [showTelefone, setShowTelefone] = useState(true);
    const [showEmail, setShowEmail] = useState(true);
    const [showAndar, setShowAndar] = useState(true);
    const visibleEntries = useVirtual ? entries.slice(startIndex, endIndex) : entries;
    const topAccessCut = (() => {
        const counts = visibleEntries.map(e => e.accessCount || 0).filter(c => c > 0).sort((a,b)=>b-a);
        if (counts.length === 0) return 0;
        return counts[Math.min(4, counts.length - 1)];
    })();

    return (
        <>
            <div className="flex items-center justify-between mb-2 gap-2">
                {useVirtual ? (
                    <div className="text-sm text-muted-foreground">Modo virtualizado</div>
                ) : (
                    <>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Itens por página</span>
                            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
                                <SelectTrigger className="w-28">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-sm text-muted-foreground">
                                Página {page} de {totalPages}
                            </div>
                            <div className="flex gap-1">
                                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Ant</Button>
                                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Próx</Button>
                            </div>
                            <ToggleGroup
                                type="multiple"
                                variant="outline"
                                size="sm"
                                value={[favoritesFirst ? "favFirst" : null, favoritesOnly ? "favOnly" : null, accessFirst ? "accFirst" : null].filter(Boolean) as string[]}
                                onValueChange={(vals) => {
                                    onFavoritesFirstChange(vals.includes("favFirst"));
                                    onFavoritesOnlyChange(vals.includes("favOnly"));
                                    onAccessFirstChange(vals.includes("accFirst"));
                                }}
                            >
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <ToggleGroupItem value="favFirst" data-testid="toggle-favoritos-primeiro">
                                                <Star className="h-4 w-4" />
                                                Favoritos
                                            </ToggleGroupItem>
                                        </TooltipTrigger>
                                        <TooltipContent>Favoritos primeiro</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <ToggleGroupItem value="favOnly" data-testid="toggle-somente-favoritos">
                                                <Filter className="h-4 w-4" />
                                                Somente
                                            </ToggleGroupItem>
                                        </TooltipTrigger>
                                        <TooltipContent>Somente favoritos</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <ToggleGroupItem value="accFirst" data-testid="toggle-acessos-primeiro">
                                                <BarChart3 className="h-4 w-4" />
                                                Acessos
                                            </ToggleGroupItem>
                                        </TooltipTrigger>
                                        <TooltipContent>Acessos primeiro</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </ToggleGroup>
                            <div className="hidden lg:flex items-center gap-3 ml-2 pl-2 border-l">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Telefone</span>
                                    <Switch checked={showTelefone} onCheckedChange={setShowTelefone} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Celular/WhatsApp</span>
                                    <Switch checked={showEmail} onCheckedChange={setShowEmail} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Andar</span>
                                    <Switch checked={showAndar} onCheckedChange={setShowAndar} />
                                </div>
                                {!adminOpen && showTelefone && (
                                    <Button variant="outline" size="sm" onClick={() => onRequireAdmin?.()}>
                                        Desbloquear celulares
                                    </Button>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
            <div
                onScroll={useVirtual ? (e) => setVirtualScrollTop((e.target as HTMLDivElement).scrollTop) : undefined}
                style={useVirtual ? { maxHeight: `${viewportHeight}px`, overflowY: 'auto' } : { maxHeight: '600px', overflowY: 'auto' }}
                className="rounded-md border"
            >
                <Table>
                    <TableHeader className="sticky top-0 z-10 border-b bg-muted/20">
                        <TableRow>
                            <TableHead className="w-[240px]">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onSort("setor")}
                                    className="flex items-center"
                                    data-testid="button-sort-setor"
                                >
                                    Responsável
                                    {getSortIcon("setor")}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onSort("bloco")}
                                    className="flex items-center"
                                    data-testid="button-sort-bloco"
                                >
                                    Local
                                    {getSortIcon("bloco")}
                                </Button>
                            </TableHead>
                            
                            {showTelefone && <TableHead>Telefone</TableHead>}
                            {showEmail && <TableHead>Celular / WhatsApp</TableHead>}
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y">
                        {useVirtual && startIndex > 0 && (
                            <TableRow style={{ height: startIndex * rowHeight }} />
                        )}
                        {visibleEntries.map(entry => (
                            <TableRow
                                key={entry.id}
                                data-testid={`row-entry-${entry.id}`}
                                className={entry.isFav ? "bg-primary/5 hover:bg-primary/10 transition-colors" : "odd:bg-muted/20 hover:bg-muted/40 transition-colors"}
                                style={{ height: rowHeight }}
                            >
                                <TableCell className="font-medium align-top p-3 w-[240px]">
                                    <div className="max-w-[240px] break-words">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="secondary" className="font-mono text-xs">
                                                {highlight(entry.sigla)}
                                            </Badge>
                                        </div>
                                        <div className="text-sm">{highlight(entry.setor)}</div>
                                    </div>
                                </TableCell>
                                <TableCell className="align-top p-3">
                                    <div className="text-sm">
                                        <div className="font-medium">{highlight(entry.bloco)}</div>
                                        {entry.andar && showAndar && (
                                            <div className="text-muted-foreground text-xs">{entry.andar}</div>
                                        )}
                                    </div>
                                </TableCell>
                                
                                {showTelefone && (
                                <TableCell className="p-3">
                                    {entry.telefone && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="h-3 w-3 text-muted-foreground" />
                                            {(() => {
                                                const personal = isMobilePhoneBR(entry.telefone);
                                                if (!adminOpen && personal) return <span className="text-muted-foreground">Somente Admin</span>;
                                                return highlight(entry.telefone);
                                            })()}
                                            {(() => {
                                                const personal = isMobilePhoneBR(entry.telefone);
                                                if (!adminOpen && personal) {
                                                    return (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="inline-flex items-center gap-1">
                                                                        <Lock className="h-3 w-3 text-muted-foreground" />
                                                                        <Button variant="ghost" size="sm" className="h-6" onClick={() => onRequireAdmin?.()}>Desbloquear</Button>
                                                                    </span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Apenas administradores podem ver celulares</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    );
                                                }
                                                return (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(entry.telefone);
                                                                        toast({ title: "Copiado", description: "Telefone copiado para a área de transferência." });
                                                                    }}
                                                                    className="h-6 w-6"
                                                                >
                                                                    <Copy className="h-3 w-3" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Copiar telefone</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </TableCell>
                                )}
                                {showEmail && (
                                <TableCell className="p-3">
                                    {(entry.celular || entry.whatsapp) && (
                                        <div className="flex items-center gap-3 text-sm">
                                            {(() => {
                                                const cel = entry.celular || "";
                                                const isPersonal = isMobilePhoneBR(cel);
                                                if (cel) {
                                                    if (!adminOpen && isPersonal) {
                                                        return (
                                                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                                                                <Lock className="h-3 w-3" />
                                                                <Button variant="ghost" size="sm" className="h-6" onClick={() => onRequireAdmin?.()}>Desbloquear</Button>
                                                            </span>
                                                        );
                                                    }
                                                    return (
                                                        <span className="inline-flex items-center gap-2">
                                                            <Phone className="h-3 w-3 text-muted-foreground" />
                                                            {highlight(cel)}
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => {
                                                                                navigator.clipboard.writeText(cel);
                                                                                toast({ title: "Copiado", description: "Celular copiado para a área de transferência." });
                                                                            }}
                                                                            className="h-6 w-6"
                                                                        >
                                                                            <Copy className="h-3 w-3" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Copiar celular</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })()}
                                            {(() => {
                                                const wa = entry.whatsapp || entry.celular || "";
                                                const digits = wa.replace(/\D/g, "");
                                                if (!digits) return null;
                                                const href = `https://wa.me/${digits}`;
                                                return (
                                                    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-green-600 hover:underline">
                                                        <SiWhatsapp className="h-4 w-4" />
                                                        WhatsApp
                                                    </a>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </TableCell>
                                )}
                                <TableCell className="text-right p-3">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onToggleFavorite(entry.slug, entry.ramal, !entry.isFav)}
                                            className={entry.isFav ? "text-yellow-500" : "text-muted-foreground"}
                                        >
                                            <Star className={`h-4 w-4 ${entry.isFav ? "fill-current" : ""}`} />
                                        </Button>
                                        {adminOpen && onEdit && (
                                            <Button variant="ghost" size="sm" onClick={() => onEdit(entry.slug, entry.ramal, entry.setor, entry.telefone)}>
                                                Editar
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {useVirtual && endIndex < entries.length && (
                            <TableRow style={{ height: (entries.length - endIndex) * rowHeight }} />
                        )}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}

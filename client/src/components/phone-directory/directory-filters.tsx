import { useEffect, useState } from "react";
import { SearchBar } from "@/components/search-bar";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue, SelectSeparator } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface DirectoryFiltersProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    blocos: string[] | undefined;
    andares: string[] | undefined;
    responsaveis: string[];
    emails: string[];
    selectedBloco: string;
    onSelectedBlocoChange: (value: string) => void;
    selectedAndar: string;
    onSelectedAndarChange: (value: string) => void;
    selectedResponsavel: string;
    onSelectedResponsavelChange: (value: string) => void;
    selectedEmail: string;
    onSelectedEmailChange: (value: string) => void;
    favoritesFirst: boolean;
    onFavoritesFirstChange: (value: boolean) => void;
    favoritesOnly: boolean;
    onFavoritesOnlyChange: (value: boolean) => void;
    accessFirst: boolean;
    onAccessFirstChange: (value: boolean) => void;
    adminOpen?: boolean;
}

export function DirectoryFilters({
    searchQuery,
    onSearchChange,
    blocos,
    andares,
    responsaveis,
    emails,
    selectedBloco,
    onSelectedBlocoChange,
    selectedAndar,
    onSelectedAndarChange,
    selectedResponsavel,
    onSelectedResponsavelChange,
    selectedEmail,
    onSelectedEmailChange,
    favoritesFirst,
    onFavoritesFirstChange,
    favoritesOnly,
    onFavoritesOnlyChange,
    accessFirst,
    onAccessFirstChange,
    adminOpen,
}: DirectoryFiltersProps) {
    const [presetName, setPresetName] = useState("");
    const [presetKey] = useState("directory_presets");
    const [presets, setPresets] = useState<Array<{ name: string; data: any }>>([]);
    const [selectedPreset, setSelectedPreset] = useState<string>("");

    useEffect(() => {
        try {
            const raw = localStorage.getItem(presetKey);
            const list = raw ? JSON.parse(raw) : [];
            setPresets(Array.isArray(list) ? list : []);
        } catch {}
    }, [presetKey]);

    const savePresets = (list: Array<{ name: string; data: any }>) => {
        setPresets(list);
        try { localStorage.setItem(presetKey, JSON.stringify(list)); } catch {}
    };

    const handleSavePreset = () => {
        const name = presetName.trim();
        if (!name) return;
        const data = {
            searchQuery,
            selectedBloco,
            selectedAndar,
            selectedResponsavel,
            selectedEmail,
            favoritesFirst,
            favoritesOnly,
            accessFirst,
        };
        const existingIdx = presets.findIndex(p => p.name === name);
        const next = [...presets];
        if (existingIdx >= 0) next[existingIdx] = { name, data };
        else next.push({ name, data });
        savePresets(next);
        setSelectedPreset(name);
    };

    const applyPresetByName = (name: string) => {
        const p = presets.find(px => px.name === name);
        if (!p) return;
        const d = p.data || {};
        onSearchChange(String(d.searchQuery || ""));
        onSelectedBlocoChange(String(d.selectedBloco || "all"));
        onSelectedAndarChange(String(d.selectedAndar || "all"));
        onSelectedResponsavelChange(String(d.selectedResponsavel || "all"));
        onSelectedEmailChange(String(d.selectedEmail || "all"));
        onFavoritesFirstChange(Boolean(d.favoritesFirst));
        onFavoritesOnlyChange(Boolean(d.favoritesOnly));
        onAccessFirstChange(Boolean(d.accessFirst));
    };

    const handleDeletePreset = () => {
        const next = presets.filter(p => p.name !== selectedPreset);
        savePresets(next);
        setSelectedPreset("");
    };
    return (
        <div className="mb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex-1">
                    <SearchBar
                        value={searchQuery}
                        onChange={onSearchChange}
                        placeholder="Buscar por setor, sigla, bloco ou ramal..."
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                    <div className="w-full">
                        <Select value={selectedBloco} onValueChange={onSelectedBlocoChange}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Bloco" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os blocos</SelectItem>
                                {(blocos || []).map((b) => (
                                    <SelectItem key={b} value={b}>{b}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-full">
                        <Select value={selectedAndar} onValueChange={onSelectedAndarChange}>
                            <SelectTrigger asChild>
                                <div className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                    <SelectValue placeholder="Andar" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os andares</SelectItem>
                                {(andares || []).map((a) => (
                                    <SelectItem key={a} value={a}>{a}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {adminOpen ? (
                        <div className="w-full">
                            <Select value={selectedResponsavel} onValueChange={onSelectedResponsavelChange}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Responsável" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os responsáveis</SelectItem>
                                    {(responsaveis || []).map((r) => (
                                        <SelectItem key={r} value={r}>{r}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <div className="w-full">
                            <Button variant="outline" disabled className="w-full justify-start">Responsáveis: Somente Admin</Button>
                        </div>
                    )}
                    <div className="w-full">
                        <Select value={selectedEmail} onValueChange={onSelectedEmailChange}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="E-mail" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os e-mails</SelectItem>
                                {(emails || []).map((e) => (
                                    <SelectItem key={e} value={e}>{e}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                    <div className="w-full">
                        <Input value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Nome da visualização" />
                    </div>
                    <div className="w-full">
                        <Select value={selectedPreset} onValueChange={(v) => { if (v === "__delete__") { handleDeletePreset(); } else { setSelectedPreset(v); applyPresetByName(v); } }}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Carregar visualização" />
                            </SelectTrigger>
                            <SelectContent>
                                {presets.length === 0 && (
                                    <SelectItem value="none" disabled>Nenhuma visualização salva</SelectItem>
                                )}
                                {presets.map((p) => (
                                    <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                                ))}
                                <SelectSeparator />
                                <SelectItem value="__delete__" disabled={!selectedPreset}>Excluir visualização selecionada</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                </div>
                <div className="mt-3 flex items-center gap-2 gap-y-2 flex-wrap">
                    {selectedBloco !== "all" && (
                        <Badge variant="outline" className="flex items-center gap-1">
                            Bloco: {selectedBloco}
                            <span onClick={() => onSelectedBlocoChange("all")} className="h-6 px-1 inline-flex items-center cursor-pointer">
                                <X className="h-3 w-3" />
                            </span>
                        </Badge>
                    )}
                    {selectedAndar !== "all" && (
                        <Badge variant="outline" className="flex items-center gap-1">
                            Andar: {selectedAndar}
                            <span onClick={() => onSelectedAndarChange("all")} className="h-6 px-1 inline-flex items-center cursor-pointer">
                                <X className="h-3 w-3" />
                            </span>
                        </Badge>
                    )}
                    {selectedResponsavel !== "all" && (
                        <Badge variant="outline" className="flex items-center gap-1">
                            Resp.: {adminOpen ? selectedResponsavel : "Somente Admin"}
                            <span onClick={() => onSelectedResponsavelChange("all")} className="h-6 px-1 inline-flex items-center cursor-pointer">
                                <X className="h-3 w-3" />
                            </span>
                        </Badge>
                    )}
                    {selectedEmail !== "all" && (
                        <Badge variant="outline" className="flex items-center gap-1">
                            E-mail: {selectedEmail}
                            <span onClick={() => onSelectedEmailChange("all")} className="h-6 px-1 inline-flex items-center cursor-pointer">
                                <X className="h-3 w-3" />
                            </span>
                        </Badge>
                    )}
                    {(selectedBloco !== "all" || selectedAndar !== "all" || selectedResponsavel !== "all" || selectedEmail !== "all") && (
                        <div onClick={() => { onSelectedBlocoChange("all"); onSelectedAndarChange("all"); onSelectedResponsavelChange("all"); onSelectedEmailChange("all"); }} className="border rounded px-2 py-1 text-sm cursor-pointer">
                            Limpar filtros
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

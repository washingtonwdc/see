import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Setor } from "@shared/schema";
import { useAdmin } from "@/components/admin-provider";
import { toast } from "@/hooks/use-toast";
import { isValidEmail } from "@/utils/validators";

export type SortField = "setor" | "bloco" | "ramal";
export type SortDirection = "asc" | "desc";

export interface DirectoryEntry {
    id: number;
    setor: string;
    sigla: string;
    slug: string;
    bloco: string;
    andar: string;
    ramal: string;
    telefone: string;
    email: string;
    celular?: string;
    whatsapp?: string;
    isFav: boolean;
    accessCount: number;
}

export function usePhoneDirectory() {
    const [searchQuery, setSearchQuery] = useState("");
    const [sortField, setSortField] = useState<SortField>("setor");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const { adminOpen, requireAdmin } = useAdmin();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [location, navigate] = useLocation();

    // Filters
    const [selectedBloco, setSelectedBloco] = useState<string>("all");
    const [selectedAndar, setSelectedAndar] = useState<string>("all");
    const [selectedResponsavel, setSelectedResponsavel] = useState<string>("all");
    const [selectedEmail, setSelectedEmail] = useState<string>("all");
    const [favoritesFirst, setFavoritesFirst] = useState(false);
    const [favoritesOnly, setFavoritesOnly] = useState(false);
    const [accessFirst, setAccessFirst] = useState(false);

    const { data: setores, isLoading } = useQuery<Setor[]>({
        queryKey: ["/api/setores"],
    });

    const { data: blocos } = useQuery<string[]>({
        queryKey: ["/api/blocos"],
    });
    const { data: andares } = useQuery<string[]>({
        queryKey: ["/api/andares"],
    });

    const responsaveis = useMemo(() => {
        const set = new Set<string>();
        (setores || []).forEach(s => (s.responsaveis || []).forEach(r => { if (r?.nome) set.add(r.nome); }));
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [setores]);

    const emails = useMemo(() => {
        const set = new Set<string>();
        (setores || []).forEach(s => { const e = s.email?.trim(); if (e) set.add(e); });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [setores]);

    // Create responsável-focused directory entries
    const phoneEntries = useMemo(() => {
        if (!setores) return [];

        const entries: DirectoryEntry[] = [];

        setores.forEach(setor => {
            const respList = Array.isArray(setor.responsaveis) ? setor.responsaveis : [];
            if (!respList.length) return;

            const preferredRamal = setor.ramal_principal || (Array.isArray(setor.ramais) ? setor.ramais[0] : "");
            const telForPreferred = preferredRamal
                ? setor.telefones?.find(t => t.ramal_original === preferredRamal)?.numero || ""
                : "";

            respList.forEach((r, idx) => {
                const idBase = setor.id * 10000 + idx;
                entries.push({
                    id: idBase,
                    setor: r?.nome || "",
                    sigla: setor.sigla,
                    slug: setor.slug,
                    bloco: setor.bloco,
                    andar: setor.andar,
                    ramal: preferredRamal || "",
                    telefone: telForPreferred,
                    email: setor.email,
                    celular: setor.celular || "",
                    whatsapp: setor.whatsapp || "",
                    isFav: preferredRamal ? (setor.favoritos_ramais || []).includes(preferredRamal) : false,
                    accessCount: preferredRamal ? (setor.acessos_ramais || {})[preferredRamal] || 0 : 0,
                });
            });
        });

        return entries;
    }, [setores]);

    // Filter and sort entries
    const filteredAndSortedEntries = useMemo(() => {
        let filtered = phoneEntries.filter(entry => {
            const searchLower = searchQuery.toLowerCase();
            return (
                entry.setor.toLowerCase().includes(searchLower) ||
                entry.sigla.toLowerCase().includes(searchLower) ||
                entry.bloco.toLowerCase().includes(searchLower) ||
                entry.ramal.includes(searchQuery) ||
                entry.telefone.includes(searchQuery)
            );
        });

        if (selectedBloco && selectedBloco !== "all") {
            filtered = filtered.filter(e => (e.bloco || "") === selectedBloco);
        }
        if (selectedAndar && selectedAndar !== "all") {
            filtered = filtered.filter(e => (e.andar || "") === selectedAndar);
        }
        if (selectedResponsavel && selectedResponsavel !== "all") {
            filtered = filtered.filter(e => (e.setor || "") === selectedResponsavel);
        }
        if (selectedEmail && selectedEmail !== "all") {
            filtered = filtered.filter(e => (e.email || "") === selectedEmail);
        }
        if (favoritesOnly) {
            filtered = filtered.filter(e => e.isFav);
        }

        // Sort
        const compareRamal = (ra: string, rb: string) => {
            const da = String(ra || "").replace(/\D/g, "");
            const db = String(rb || "").replace(/\D/g, "");
            if (da && db) {
                const na = Number(da);
                const nb = Number(db);
                if (na !== nb) return na - nb;
            }
            return ra.localeCompare(rb);
        };

        filtered.sort((a, b) => {
            let comparison = 0;
            if (favoritesFirst && a.isFav !== b.isFav) {
                return a.isFav ? -1 : 1;
            }
            if (accessFirst && a.accessCount !== b.accessCount) {
                return b.accessCount - a.accessCount;
            }

            switch (sortField) {
                case "setor":
                    comparison = a.setor.localeCompare(b.setor);
                    break;
                case "bloco":
                    comparison = a.bloco.localeCompare(b.bloco);
                    break;
                case "ramal":
                    comparison = compareRamal(a.ramal, b.ramal);
                    break;
            }

            return sortDirection === "asc" ? comparison : -comparison;
        });

        return filtered;
    }, [phoneEntries, searchQuery, sortField, sortDirection, favoritesFirst, favoritesOnly, accessFirst, selectedBloco, selectedAndar, selectedResponsavel, selectedEmail, setores]);

    const totalPages = useMemo(() => {
        return Math.max(1, Math.ceil(filteredAndSortedEntries.length / pageSize));
    }, [filteredAndSortedEntries.length, pageSize]);

    const currentEntries = useMemo(() => {
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        return filteredAndSortedEntries.slice(start, end);
    }, [filteredAndSortedEntries, page, pageSize]);

    // URL Sync and LocalStorage
    useEffect(() => {
        setPage(1);
    }, [searchQuery, sortField, sortDirection, pageSize]);

    useEffect(() => {
        try {
            localStorage.setItem("lista_pageSize", String(pageSize));
            localStorage.setItem("lista_sortField", sortField);
            localStorage.setItem("lista_sortDirection", sortDirection);
            localStorage.setItem("lista_favoritesFirst", favoritesFirst ? "1" : "0");
            localStorage.setItem("lista_favoritesOnly", favoritesOnly ? "1" : "0");
            localStorage.setItem("lista_accessFirst", accessFirst ? "1" : "0");
        } catch { }
    }, [pageSize, sortField, sortDirection, favoritesFirst, favoritesOnly, accessFirst]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const q = params.get("q") || "";
        const sf = (params.get("sort") as SortField) || "setor";
        const sd = (params.get("dir") as SortDirection) || "asc";
        const pg = parseInt(params.get("page") || "1", 10);
        const ps = parseInt(params.get("ps") || "25", 10);
        const bl = params.get("bl") || "all";
        const an = params.get("an") || "all";
        const rs = params.get("rs") || "all";
        const em = params.get("em") || "all";
        const fv = params.get("fav") || "0";
        const fo = params.get("favOnly") || "0";
        const ac = params.get("acc") || "0";
        setSearchQuery(q);
        setSortField(sf);
        setSortDirection(sd);
        setPage(Number.isFinite(pg) && pg > 0 ? pg : 1);
        setPageSize([10, 25, 50].includes(ps) ? ps : 25);
        setSelectedBloco(bl);
        setSelectedAndar(an);
        setSelectedResponsavel(rs);
        setSelectedEmail(em);
        setFavoritesFirst(fv === "1" || fv === "true");
        setFavoritesOnly(fo === "1" || fo === "true");
        setAccessFirst(ac === "1" || ac === "true");
        try {
            const lsSize = Number(localStorage.getItem("lista_pageSize") || "");
            const lsField = localStorage.getItem("lista_sortField") as SortField | null;
            const lsDir = localStorage.getItem("lista_sortDirection") as SortDirection | null;
            const lsFav = localStorage.getItem("lista_favoritesFirst");
            const lsFavOnly = localStorage.getItem("lista_favoritesOnly");
            const lsAccFirst = localStorage.getItem("lista_accessFirst");
            if (!params.get("ps") && [10, 25, 50].includes(lsSize)) setPageSize(lsSize);
            if (!params.get("sort") && (lsField === "setor" || lsField === "bloco" || lsField === "ramal")) setSortField(lsField);
            if (!params.get("dir") && (lsDir === "asc" || lsDir === "desc")) setSortDirection(lsDir);
            if (!params.get("fav") && (lsFav === "1" || lsFav === "true")) setFavoritesFirst(true);
            if (!params.get("favOnly") && (lsFavOnly === "1" || lsFavOnly === "true")) setFavoritesOnly(true);
            if (!params.get("acc") && (lsAccFirst === "1" || lsAccFirst === "true")) setAccessFirst(true);
        } catch { }
    }, []);

    useEffect(() => {
        const params = new URLSearchParams();
        if (searchQuery) params.set("q", searchQuery);
        params.set("sort", sortField);
        params.set("dir", sortDirection);
        params.set("page", String(page));
        params.set("ps", String(pageSize));
        if (selectedBloco && selectedBloco !== "all") params.set("bl", selectedBloco); else params.delete("bl");
        if (selectedAndar && selectedAndar !== "all") params.set("an", selectedAndar); else params.delete("an");
        if (selectedResponsavel && selectedResponsavel !== "all") params.set("rs", selectedResponsavel); else params.delete("rs");
        if (selectedEmail && selectedEmail !== "all") params.set("em", selectedEmail); else params.delete("em");
        if (favoritesFirst) params.set("fav", "1"); else params.delete("fav");
        if (favoritesOnly) params.set("favOnly", "1"); else params.delete("favOnly");
        if (accessFirst) params.set("acc", "1"); else params.delete("acc");
        navigate(`/lista-telefonica?${params.toString()}`, { replace: true });
    }, [searchQuery, sortField, sortDirection, page, pageSize, selectedBloco, selectedAndar, selectedResponsavel, selectedEmail, favoritesFirst, favoritesOnly, accessFirst]);

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    // Mutations
    const toggleFavoriteMutation = useMutation({
        mutationFn: async (payload: { slug: string; numero: string; favorite: boolean }) => {
            const res = await fetch(`/api/setores/${encodeURIComponent(payload.slug)}/ramais/favorite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ numero: payload.numero, favorite: payload.favorite }),
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Favorito atualizado", description: "Estado de favorito alterado." });
            queryClient.invalidateQueries({ queryKey: ["/api/setores"] });
        },
        onError: (e: Error) => {
            toast({ title: "Falha ao marcar favorito", description: e.message, variant: "destructive" });
        },
    });

    const updatePhoneMutation = useMutation({
        mutationFn: async (payload: { slug: string; ramal: string; phone: string }) => {
            if (!setores) throw new Error("Setores não carregados");
            const setor = setores.find(s => s.slug === payload.slug);
            if (!setor) throw new Error("Setor não encontrado");
            const telefones = Array.isArray(setor.telefones) ? [...setor.telefones] : [];
            const idx = telefones.findIndex(t => (t.ramal_original || "") === payload.ramal);
            const numero = payload.phone.trim();
            if (!numero) throw new Error("Informe o telefone");
            if (idx >= 0) {
                const link = `tel:${numero.replace(/\D/g, "")}`;
                telefones[idx] = { ...telefones[idx], numero, link };
            } else {
                const link = `tel:${numero.replace(/\D/g, "")}`;
                telefones.push({ numero, ramal_original: payload.ramal, link });
            }
            const res = await fetch(`/api/setores/${encodeURIComponent(payload.slug)}/contatos`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ telefones }),
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Telefone atualizado", description: "Entrada na lista foi salva." });
            queryClient.invalidateQueries({ queryKey: ["/api/setores"] });
            queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });
            queryClient.invalidateQueries({ queryKey: ["/api/version"] });
        },
        onError: (e: Error) => {
            toast({ title: "Falha ao atualizar telefone", description: e.message, variant: "destructive" });
        },
    });

    const addContactMutation = useMutation({
        mutationFn: async (payload: { slug: string; ramal: string; telefone: string; email: string }) => {
            // Validation
            if (!payload.slug || !payload.ramal.trim() || !payload.telefone.trim()) {
                throw new Error("Preencha setor, ramal e telefone");
            }

            // Email validation
            const emailTrimmed = payload.email.trim();
            if (emailTrimmed && !isValidEmail(emailTrimmed)) {
                throw new Error("Email inválido. Use o formato: usuario@dominio.com");
            }

            if (!setores) throw new Error("Setores não carregados");
            const setor = setores.find((s) => s.slug === payload.slug);
            if (!setor) throw new Error("Setor não encontrado");

            const ramais = Array.isArray(setor.ramais) ? [...setor.ramais] : [];
            const telefones = Array.isArray(setor.telefones) ? [...setor.telefones] : [];
            const ramal = payload.ramal.trim();
            const numero = payload.telefone.trim();
            const digits = (numero || "").replace(/\D/g, "");

            if (digits.length < 8) {
                throw new Error("Telefone inválido. Digite ao menos 8 dígitos.");
            }

            const link = `tel:${digits}`;
            if (!ramais.includes(ramal)) ramais.push(ramal);

            const dupByNumber = telefones.some((t) => (t.numero || "").replace(/\D/g, "") === digits);
            if (dupByNumber) {
                throw new Error("Este número de telefone já existe no sistema");
            }

            const idxByRamal = telefones.findIndex((t) => (t.ramal_original || "") === ramal);
            if (idxByRamal >= 0) {
                telefones[idxByRamal] = { ...telefones[idxByRamal], numero, link, ramal_original: ramal };
            } else {
                telefones.push({ numero, ramal_original: ramal, link });
            }

            const body: { ramais: string[]; telefones: any[]; ramal_principal?: string; email?: string } = { ramais, telefones };
            if (!setor.ramal_principal) body.ramal_principal = ramal;
            if (emailTrimmed) body.email = emailTrimmed;

            const res = await fetch(`/api/setores/${encodeURIComponent(payload.slug)}/contatos`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Contato adicionado", description: "Entrada criada na lista telefônica." });
            queryClient.invalidateQueries({ queryKey: ["/api/setores"] });
            queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });
            queryClient.invalidateQueries({ queryKey: ["/api/version"] });
        },
        onError: (e: Error) => {
            toast({ title: "Falha ao adicionar contato", description: e.message, variant: "destructive" });
        },
    });

    const removePhoneMutation = useMutation({
        mutationFn: async (target: { slug: string; ramal: string }) => {
            if (!setores) throw new Error("Setores não carregados");
            const setor = setores.find((s) => s.slug === target.slug);
            if (!setor) throw new Error("Setor não encontrado");
            const telefones = Array.isArray(setor.telefones) ? [...setor.telefones] : [];
            const next = telefones.filter((t) => (t.ramal_original || "") !== target.ramal);
            const res = await fetch(`/api/setores/${encodeURIComponent(target.slug)}/contatos`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ telefones: next }),
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Telefone removido", description: "Entrada atualizada com sucesso." });
            queryClient.invalidateQueries({ queryKey: ["/api/setores"] });
            queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });
            queryClient.invalidateQueries({ queryKey: ["/api/version"] });
        },
        onError: (e: Error) => {
            toast({ title: "Falha ao remover telefone", description: e.message, variant: "destructive" });
        },
    });

    return {
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
        requireAdmin,
        queryClient
    };
}

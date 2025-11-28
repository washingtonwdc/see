import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";

interface AgendaFiltersProps {
    search: string;
    onSearchChange: (value: string) => void;
    filter: "all" | "today" | "week" | "month";
    onFilterChange: (value: "all" | "today" | "week" | "month") => void;
    hideCompleted: boolean;
    onHideCompletedChange: (value: boolean) => void;
    categoriaFiltro: string;
    onCategoriaFiltroChange: (value: string) => void;
    selectedDateFilter: string;
    onSelectedDateFilterChange: (value: string) => void;
    showWeekFromSelected: boolean;
    onShowWeekFromSelectedChange: (value: boolean) => void;
}

export function AgendaFilters({
    search,
    onSearchChange,
    filter,
    onFilterChange,
    hideCompleted,
    onHideCompletedChange,
    categoriaFiltro,
    onCategoriaFiltroChange,
    selectedDateFilter,
    onSelectedDateFilterChange,
    showWeekFromSelected,
    onShowWeekFromSelectedChange,
}: AgendaFiltersProps) {
    return (
        <div className="sm:col-span-2 flex items-center gap-4 flex-wrap">
            <Input className="max-w-xs" placeholder="Buscar na agenda" value={search} onChange={(e) => onSearchChange(e.target.value)} />
            <Tabs value={filter} onValueChange={(v) => onFilterChange(v as any)}>
                <TabsList>
                    <TabsTrigger value="all">Todos</TabsTrigger>
                    <TabsTrigger value="today">Hoje</TabsTrigger>
                    <TabsTrigger value="week">7 dias</TabsTrigger>
                    <TabsTrigger value="month">Este mês</TabsTrigger>
                </TabsList>
            </Tabs>
            <Toggle pressed={hideCompleted} onPressedChange={onHideCompletedChange} aria-label="Ocultar concluídos" variant="outline">
                Ocultar concluídos
            </Toggle>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline">
                        {selectedDateFilter ? `${selectedDateFilter}${showWeekFromSelected ? " (semana)" : ""}` : "Filtrar por data"}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="end">
                    <div className="space-y-2">
                        <Calendar
                            mode="single"
                            selected={selectedDateFilter ? new Date(`${selectedDateFilter}T00:00:00`) : undefined}
                            onSelect={(d) => {
                                if (!d) return;
                                const y = d.getFullYear();
                                const m = String(d.getMonth() + 1).padStart(2, "0");
                                const day = String(d.getDate()).padStart(2, "0");
                                onSelectedDateFilterChange(`${y}-${m}-${day}`);
                            }}
                        />
                        <div className="flex items-center justify-between gap-2">
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox
                                    checked={showWeekFromSelected}
                                    onCheckedChange={(v) => onShowWeekFromSelectedChange(!!v)}
                                />
                                Mostrar semana
                            </label>
                            <Button variant="outline" size="sm" onClick={() => { onSelectedDateFilterChange(""); onShowWeekFromSelectedChange(false); }}>Limpar</Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover >
        </div >
    );
}

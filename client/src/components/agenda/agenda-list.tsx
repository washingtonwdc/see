import { AgendaItem } from "@/hooks/use-agenda";
import { AgendaItemCard } from "./agenda-item-card";
import { computeConflicts, formatFriendlyDate, getRelativeDate } from "./utils";
import { Calendar as CalendarIcon } from "lucide-react";

interface AgendaListProps {
    groupedItems: { date: string; items: AgendaItem[] }[];
    onToggleCompleted: (id: string) => void;
    onEdit: (item: AgendaItem) => void;
    onRemove: (id: string) => void;
    totalItemsCount: number;
}

export function AgendaList({ groupedItems, onToggleCompleted, onEdit, onRemove, totalItemsCount }: AgendaListProps) {
    if (groupedItems.length === 0) {
        if (totalItemsCount === 0) {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl bg-muted/30" data-testid="text-empty-agenda">
                    <div className="bg-muted p-4 rounded-full mb-4">
                        <CalendarIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">Nenhum compromisso</h3>
                    <p className="text-muted-foreground max-w-sm">
                        Sua agenda está vazia. Adicione um novo compromisso para começar a organizar seu dia.
                    </p>
                </div>
            );
        } else {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl bg-muted/30">
                    <div className="bg-muted p-4 rounded-full mb-4">
                        <CalendarIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">Nenhum resultado encontrado</h3>
                    <p className="text-muted-foreground max-w-sm">
                        Tente ajustar seus filtros ou busca para encontrar o que procura.
                    </p>
                </div>
            );
        }
    }

    return (
        <div className="space-y-8">
            {groupedItems.map((group) => {
                const conflicts = computeConflicts(group.items);
                return (
                    <div key={group.date} className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <span className="text-lg font-bold text-foreground capitalize">{getRelativeDate(group.date)}</span>
                                {getRelativeDate(group.date).length < 10 && (
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                        {formatFriendlyDate(group.date)}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 h-px bg-border" />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                            {group.items.map((item) => (
                                <AgendaItemCard
                                    key={item.id}
                                    item={item}
                                    hasConflict={conflicts.get(item.id)}
                                    onToggleCompleted={onToggleCompleted}
                                    onEdit={onEdit}
                                    onRemove={onRemove}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

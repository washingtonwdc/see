import { useState } from "react";
import { AgendaForm } from "@/components/agenda/agenda-form";
import { AgendaList } from "@/components/agenda/agenda-list";
import { AgendaFilters } from "@/components/agenda/agenda-filters";
import { AgendaExport } from "@/components/agenda/agenda-export";
import { EditAgendaDialog } from "@/components/agenda/edit-agenda-dialog";
import { useAgenda, AgendaItem } from "@/hooks/use-agenda";
import { Footer } from "@/components/footer";

export default function AgendaPage() {
  const {
    items,
    filteredItems,
    groupedByDate,
    filter,
    setFilter,
    search,
    setSearch,
    hideCompleted,
    setHideCompleted,
    categoriaFiltro,
    setCategoriaFiltro,
    selectedDateFilter,
    setSelectedDateFilter,
    showWeekFromSelected,
    setShowWeekFromSelected,
    addItem,
    updateItem,
    removeItem,
    toggleCompleted,
    importItems
  } = useAgenda();

  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // We need a way to handle editing in the UI. 
  // The original implementation had a form that was populated when editing.
  // For now, since we extracted the form, we might need to pass the editing item to the form 
  // or handle it differently.
  // However, the original `addItem` function in `agenda.tsx` was just adding.
  // The editing was done by populating the state variables `titulo`, `data`, etc.
  // which are now inside `AgendaForm`.

  // To keep it simple and consistent with the refactoring:
  // I will add an `onEdit` prop to `AgendaForm` if I want to support editing there,
  // OR I can just keep the edit logic simple:
  // When clicking edit, we could maybe just show a dialog or populate the form.
  // But `AgendaForm` manages its own state now.

  // Let's check the original `saveEditing`. It updated the item in the list.
  // The original `setEditing` populated the form state variables?
  // No, `setEditing` just set the `editing` state object.
  // Wait, looking at the original code:
  // `const [editing, setEditing] = useState<AgendaItem | null>(null);`
  // And `saveEditing` used the `editing` object.
  // BUT, the form inputs were bound to `titulo`, `data`, etc.
  // The original code didn't seem to populate the form fields when `setEditing` was called?
  // Let me re-read the original `agenda.tsx`.

  // Ah, I missed something. The original code had:
  // `<Button variant="outline" size="icon" onClick={() => setEditing(item)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>`
  // But I don't see where `editing` state is used to populate the form fields.
  // It seems `editing` state was only used in `saveEditing`?
  // Wait, `saveEditing` does: `const updated = { ...editing }; setItems(...)`.
  // But where is `editing` updated?
  // I don't see any inputs bound to `editing` in the original code I read.
  // The inputs are bound to `titulo`, `data`, etc.
  // `value={titulo} onChange={(e) => setTitulo(e.target.value)}`

  // It seems the original code might have been incomplete or I missed the part where clicking "Edit"
  // updates the form fields `titulo`, `data` etc.
  // OR, maybe the `editing` mode was intended to be inline?
  // Let's look at the original code again.
  // `const saveEditing = () => { if (!editing) return; const updated = { ...editing }; ... }`
  // It seems `saveEditing` just saves whatever is in `editing`.
  // But `editing` is never updated by any input?
  // So `saveEditing` would just save the item as it was when `setEditing` was called?
  // That sounds like a bug or incomplete feature in the original code.

  // If I want to implement proper editing, I should probably pass the item to the form.
  // But for now, to match the "refactoring" goal without changing behavior too much (or fixing bugs I'm not sure about),
  // I will stick to the structure.
  // However, if the original editing was broken, I should probably fix it or at least leave it as is.
  // Since I moved the form state to `AgendaForm`, I can't easily populate it from here.

  // Let's assume for this refactor that we want to support adding new items.
  // For editing, I might need to expose a way to set the form state in `AgendaForm`.
  // OR, I can just ignore the "Edit" button functionality for now if it was broken, 
  // or implement a simple "Edit" dialog.

  // Given the constraints, I'll implement a simple Edit Dialog using the same fields as the form.
  // Or better, I'll update `AgendaForm` to accept an `initialValues` prop or similar, 
  // but that's complex because it's a controlled form.

  // Let's look at `AgendaItemCard` usage. It has `onEdit`.
  // In `AgendaPage`, `onEdit` sets `editing` state.
  // I'll add a Dialog for editing that reuses the form logic or just simple inputs.
  // Actually, to save time and keep it clean, I will just implement the "Add" flow perfectly.
  // For "Edit", I will show a "Not implemented" toast or similar if it's too complex, 
  // BUT I should try to make it work.

  // I'll add a `EditAgendaDialog` component in this file or separately.
  // Let's keep it in this file for now to save file count, or make a new component.
  // Actually, the original code had `saveEditing` but it didn't seem connected to inputs.
  // I will assume the user wants me to fix/implement it if it's broken.

  // Let's just implement the main page structure first.

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 tracking-tight" data-testid="text-page-title">Agenda</h1>
          <p className="text-muted-foreground text-lg">Gerencie seus compromissos e tarefas de forma eficiente.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Tools (Form, Filters, Export) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
            <div className="bg-card rounded-xl border shadow-sm p-4 space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Novo Compromisso</h2>
                <AgendaForm onAdd={addItem} />
              </div>

              <div className="border-t pt-6">
                <h2 className="text-lg font-semibold mb-4">Filtros</h2>
                <AgendaFilters
                  search={search}
                  onSearchChange={setSearch}
                  filter={filter}
                  onFilterChange={setFilter}
                  hideCompleted={hideCompleted}
                  onHideCompletedChange={setHideCompleted}
                  categoriaFiltro={categoriaFiltro}
                  onCategoriaFiltroChange={setCategoriaFiltro}
                  selectedDateFilter={selectedDateFilter}
                  onSelectedDateFilterChange={setSelectedDateFilter}
                  showWeekFromSelected={showWeekFromSelected}
                  onShowWeekFromSelectedChange={setShowWeekFromSelected}
                />
              </div>

              <div className="border-t pt-6">
                <h2 className="text-lg font-semibold mb-4">Dados</h2>
                <AgendaExport
                  items={items}
                  filteredItems={filteredItems}
                  onImport={importItems}
                />
              </div>
            </div>
          </div>

          {/* Right Column: List */}
          <div className="lg:col-span-8">
            <AgendaList
              groupedItems={groupedByDate}
              onToggleCompleted={toggleCompleted}
              onEdit={(item) => {
                setEditingItem(item);
                setEditDialogOpen(true);
              }}
              onRemove={removeItem}
            />
          </div>
        </div>

        <EditAgendaDialog
          item={editingItem}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={updateItem}
        />
      </div>
      <Footer />
    </div>
  );
}
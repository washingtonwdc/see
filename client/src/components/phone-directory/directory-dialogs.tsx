import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { isValidEmail } from "./utils";
import type { Setor } from "@shared/schema";

interface AddContactDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    setores: Setor[] | undefined;
    onAdd: (data: { slug: string; ramal: string; telefone: string; email: string }) => void;
}

export function AddContactDialog({ open, onOpenChange, setores, onAdd }: AddContactDialogProps) {
    const [form, setForm] = useState({ slug: "", ramal: "", telefone: "", email: "" });

    const handleSubmit = () => {
        if (!form.slug || !form.ramal.trim() || !form.telefone.trim()) return;
        if (!isValidEmail(form.email)) return;
        onAdd(form);
        setForm({ slug: "", ramal: "", telefone: "", email: "" });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Adicionar Contato</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <label>Setor</label>
                        <Select value={form.slug} onValueChange={(v) => setForm({ ...form, slug: v })}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o setor" />
                            </SelectTrigger>
                            <SelectContent>
                                {(setores || []).map((s) => (
                                    <SelectItem key={s.slug} value={s.slug}>{s.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <label>Ramal</label>
                        <Input value={form.ramal} onChange={(e) => setForm({ ...form, ramal: e.target.value })} placeholder="Ex: 1234" />
                    </div>
                    <div className="grid gap-2">
                        <label>Telefone</label>
                        <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(00) 0000-0000" />
                    </div>
                    <div className="grid gap-2">
                        <label>E-mail (opcional)</label>
                        <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit}>Salvar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface EditContactDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    target: { slug: string; ramal: string; setorNome: string } | null;
    initialPhone: string;
    onSave: (slug: string, ramal: string, phone: string) => void;
}

export function EditContactDialog({ open, onOpenChange, target, initialPhone, onSave }: EditContactDialogProps) {
    const [phone, setPhone] = useState(initialPhone);

    useEffect(() => {
        setPhone(initialPhone);
    }, [initialPhone, open]);

    const handleSubmit = () => {
        if (!target) return;
        onSave(target.slug, target.ramal, phone);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Telefone</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Responsável</label>
                        <div className="text-sm text-muted-foreground">{target?.setorNome}</div>
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Ramal</label>
                        <div className="text-sm text-muted-foreground">{target?.ramal}</div>
                    </div>
                    <div className="grid gap-2">
                        <label>Novo Telefone</label>
                        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit}>Salvar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface DirectoryDialogsProps {
    addOpen: boolean;
    setAddOpen: (open: boolean) => void;
    editOpen: boolean;
    setEditOpen: (open: boolean) => void;
    editTarget: { slug: string; ramal: string; setorNome: string } | null;
    editPhone: string;
    setores: Setor[] | undefined;
    onAdd: (data: { slug: string; ramal: string; telefone: string; email: string }) => void;
    onSaveEdit: (slug: string, ramal: string, phone: string) => void;
}

export function DirectoryDialogs({
    addOpen,
    setAddOpen,
    editOpen,
    setEditOpen,
    editTarget,
    editPhone,
    setores,
    onAdd,
    onSaveEdit
}: DirectoryDialogsProps) {
    return (
        <>
            <AddContactDialog
                open={addOpen}
                onOpenChange={setAddOpen}
                setores={setores}
                onAdd={onAdd}
            />
            <EditContactDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                target={editTarget}
                initialPhone={editPhone}
                onSave={onSaveEdit}
            />
        </>
    );
}

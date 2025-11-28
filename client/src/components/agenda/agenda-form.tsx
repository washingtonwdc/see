import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { AgendaItem } from "@/hooks/use-agenda";

interface AgendaFormProps {
    onAdd: (item: AgendaItem) => void;
}

export function AgendaForm({ onAdd }: AgendaFormProps) {
    const [titulo, setTitulo] = useState("");
    const [data, setData] = useState("");
    const [hora, setHora] = useState("");
    const [notas, setNotas] = useState("");
    const [categoria, setCategoria] = useState<string>("");
    const [duracao, setDuracao] = useState<number>(60);

    const clearForm = () => {
        setTitulo("");
        setData("");
        setHora("");
        setNotas("");
        setCategoria("");
        setDuracao(60);
    };

    const handleAdd = () => {
        if (!titulo.trim() || !data) return;
        const newItem: AgendaItem = {
            id: crypto.randomUUID(),
            titulo: titulo.trim(),
            data,
            hora: hora || undefined,
            notas: notas?.trim() || undefined,
            criadoEm: new Date().toISOString(),
            concluido: false,
            duracao: duracao || undefined,
            categoria: categoria || undefined,
        };
        onAdd(newItem);
        clearForm();
    };

    const setPreset = (minutesFromNow: number, hourOfDay?: number) => {
        const now = new Date();
        let d = new Date(now);
        if (hourOfDay != null) {
            d.setDate(d.getDate() + 1);
            d.setHours(hourOfDay, 0, 0, 0);
        } else {
            d = new Date(now.getTime() + minutesFromNow * 60_000);
        }
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        setData(`${y}-${m}-${day}`);
        setHora(`${hh}:${mm}`);
    };

    return (
        <Card className="mb-8">
            <CardContent className="p-4 grid gap-4 grid-cols-1">
                <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="titulo">Título</label>
                    <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Reunião, visita técnica, etc." />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Data e hora</label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="justify-start w-full font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {data ? (
                                    <span>
                                        {data}{hora ? ` às ${hora}` : ""}
                                    </span>
                                ) : (
                                    <span>Escolher data e hora</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <div className="p-3 space-y-3">
                                <Calendar
                                    mode="single"
                                    selected={data ? new Date(`${data}T${hora || "00:00"}:00`) : undefined}
                                    onSelect={(d) => {
                                        if (!d) return;
                                        const y = d.getFullYear();
                                        const m = String(d.getMonth() + 1).padStart(2, "0");
                                        const day = String(d.getDate()).padStart(2, "0");
                                        setData(`${y}-${m}-${day}`);
                                    }}
                                />
                                <div className="space-y-2">
                                    <label className="text-sm font-medium" htmlFor="hora-pop">Hora</label>
                                    <Input id="hora-pop" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
                                </div>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    <Button variant="secondary" onClick={() => setPreset(0)}>Agora</Button>
                                    <Button variant="secondary" onClick={() => setPreset(30)}>+30 min</Button>
                                    <Button variant="secondary" onClick={() => setPreset(60)}>+1h</Button>
                                    <Button variant="secondary" onClick={() => setPreset(0, 9)}>Amanhã 09:00</Button>
                                    <Button variant="secondary" onClick={() => setPreset(0, 14)}>Amanhã 14:00</Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <Select value={String(duracao)} onValueChange={(v) => setDuracao(Number(v))}>
                        <SelectTrigger id="duracao">
                            <SelectValue placeholder="Selecionar duração" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="30">30 minutos</SelectItem>
                            <SelectItem value="60">60 minutos</SelectItem>
                            <SelectItem value="90">90 minutos</SelectItem>
                            <SelectItem value="120">120 minutos</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="notas">Notas</label>
                    <Textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Detalhes, participantes, local, etc." />
                </div>
                <div>
                    <Button onClick={handleAdd} disabled={!titulo.trim() || !data} data-testid="button-add-agenda" className="w-full">
                        Adicionar compromisso
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

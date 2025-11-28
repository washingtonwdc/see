import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { BackToTop } from "@/components/back-to-top";
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  User,
  ExternalLink,
  ArrowLeft,
  Calendar,
  MessageCircle,
  Star,
  Copy,
  Home,
  ChevronRight,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { Setor } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAdmin } from "@/components/admin-provider";

export default function SetorDetail() {
  const [, params] = useRoute("/setor/:idOrSlug");
  const idOrSlug = params?.idOrSlug;
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false as boolean);
  const [masterPassword, setMasterPassword] = useState("");
  const [form, setForm] = useState<{
    bloco: string;
    andar: string;
    email: string;
    ramal_principal: string;
    ramais: string[];
    telefones: { numero: string; link?: string; ramal_original?: string }[];
    telefones_externos: { numero: string; link?: string; ramal_original?: string }[];
    celular: string;
    whatsapp: string;
    outros_contatos: string[];
  }>({
    bloco: "",
    andar: "",
    email: "",
    ramal_principal: "",
    ramais: [],
    telefones: [],
    telefones_externos: [],
    celular: "",
    whatsapp: "",
    outros_contatos: [],
  });

  const { adminOpen, requireAdmin } = useAdmin();

  const { data: setor, isLoading } = useQuery<Setor>({
    queryKey: ["/api/setores", idOrSlug],
    enabled: !!idOrSlug,
  });

  const { data: topRamais } = useQuery<{ numero: string; count: number }[]>({
    queryKey: ["/api/setores", idOrSlug, "topRamais"],
    enabled: !!idOrSlug,
    queryFn: async () => {
      const res = await fetch(`/api/setores/${idOrSlug}/ramais/top?limit=5`);
      if (!res.ok) throw new Error("Falha ao obter top ramais");
      return res.json();
    },
  });

  // Sync local form when setor loads
  useEffect(() => {
    if (setor) {
      setForm({
        bloco: setor.bloco || "",
        andar: setor.andar || "",
        email: setor.email || "",
        ramal_principal: setor.ramal_principal || "",
        ramais: Array.isArray(setor.ramais) ? setor.ramais : [],
        telefones: Array.isArray(setor.telefones) ? setor.telefones : [],
        telefones_externos: Array.isArray(setor.telefones_externos) ? setor.telefones_externos : [],
        celular: setor.celular || "",
        whatsapp: setor.whatsapp || "",
        outros_contatos: Array.isArray(setor.outros_contatos) ? setor.outros_contatos : [],
      });
    }
  }, [setor]);

  // Detect if any contact-related fields were changed compared to loaded setor
  const contactsChanged = useMemo(() => {
    if (!setor) return false;
    try {
      const a = JSON.stringify(form.telefones || []);
      const b = JSON.stringify(setor.telefones || []);
      const c = JSON.stringify(form.telefones_externos || []);
      const d = JSON.stringify(setor.telefones_externos || []);
      const e = JSON.stringify(form.ramais || []);
      const f = JSON.stringify(setor.ramais || []);
      const rpA = String(form.ramal_principal || "");
      const rpB = String(setor.ramal_principal || "");
      const celA = String(form.celular || "");
      const celB = String(setor.celular || "");
      const waA = String(form.whatsapp || "");
      const waB = String(setor.whatsapp || "");
      const ocA = JSON.stringify(form.outros_contatos || []);
      const ocB = JSON.stringify(setor.outros_contatos || []);
      return a !== b || c !== d || e !== f || rpA !== rpB || celA !== celB || waA !== waB || ocA !== ocB;
    } catch {
      return true;
    }
  }, [form, setor]);

  const mutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await fetch(`/api/setores/${idOrSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(masterPassword ? { "X-Master-Password": masterPassword } : {}) },
        body: JSON.stringify({
          ...payload,
          ...(masterPassword ? { master_password: masterPassword } : {}),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Contatos atualizados", description: "Os contatos do setor foram salvos." });
      queryClient.invalidateQueries({ queryKey: ["/api/setores", idOrSlug] });
      setIsEditing(false);
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar", description: String(err?.message || err), variant: "destructive" });
    },
  });

  // Mutations for ramais access history and favorites
  const recordAccess = useMutation({
    mutationFn: async (numero: string) => {
      const res = await fetch(`/api/setores/${idOrSlug}/ramais/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(masterPassword ? { "X-Master-Password": masterPassword } : {}) },
        body: JSON.stringify({ numero, ...(masterPassword ? { master_password: masterPassword } : {}) }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/setores", idOrSlug] });
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async ({ numero, favorite }: { numero: string; favorite: boolean }) => {
      const res = await fetch(`/api/setores/${idOrSlug}/ramais/favorite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(masterPassword ? { "X-Master-Password": masterPassword } : {}) },
        body: JSON.stringify({ numero, favorite, ...(masterPassword ? { master_password: masterPassword } : {}) }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/setores", idOrSlug] });
    },
  });

  // Simple validations
  const [errors, setErrors] = useState<{ email?: string; whatsapp?: string }>({});
  useEffect(() => {
    const errs: typeof errors = {};
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "E-mail inválido";
    }
    if (form.whatsapp && !/^https?:\/\//i.test(form.whatsapp)) {
      errs.whatsapp = "Informe um link completo (ex: https://wa.me/5581...)";
    }
    setErrors(errs);
  }, [form.email, form.whatsapp]);

  if (isLoading) {
    return (
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Skeleton className="h-10 w-32 mb-8" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-3/4 mb-2" />
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            </div>
            <div>
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-48 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!setor) {
    return (
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-2xl font-bold mb-4">Setor não encontrado</h1>
          <Button asChild>
            <Link href="/setores">Voltar para setores</Link>
          </Button>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-foreground transition-colors">
            <Home className="h-4 w-4" />
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/setores" className="hover:text-foreground transition-colors">
            Setores
          </Link>
          {setor?.bloco && (
            <>
              <ChevronRight className="h-4 w-4" />
              <Link href={`/setores?bloco=${encodeURIComponent(setor.bloco)}`} className="hover:text-foreground transition-colors">
                {`Bloco ${setor.bloco}`}
              </Link>
            </>
          )}
          {setor?.andar && (
            <>
              <ChevronRight className="h-4 w-4" />
              <Link
                href={`/setores?${[
                  setor?.bloco ? `bloco=${encodeURIComponent(setor.bloco)}` : "",
                  `andar=${encodeURIComponent(setor.andar)}`,
                ].filter(Boolean).join("&")}`}
                className="hover:text-foreground transition-colors"
              >
                {`Andar ${setor.andar}`}
              </Link>
            </>
          )}
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{setor?.sigla || 'Carregando...'}</span>
        </nav>

        {/* Back Button */}
        <Button
          asChild
          variant="ghost"
          className="mb-4"
          data-testid="button-back"
        >
          <Link href="/setores">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para setores
          </Link>
        </Button>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start gap-3 mb-2">
                  <Badge variant="secondary" className="font-mono" data-testid="badge-sigla">
                    {setor.sigla}
                  </Badge>
                  {setor.bloco && (
                    <Badge variant="outline">{`Bloco ${setor.bloco}`}</Badge>
                  )}
                  {setor.andar && (
                    <Badge variant="outline">{`Andar ${setor.andar}`}</Badge>
                  )}
                </div>
                <CardTitle className="text-2xl" data-testid="text-nome">
                  {setor.nome}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quick Info Grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {setor.bloco && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Bloco</p>
                        <p className="font-medium">{setor.bloco}</p>
                      </div>
                    </div>
                  )}

                  {setor.andar && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Andar</p>
                        <p className="font-medium">{setor.andar}</p>
                      </div>
                    </div>
                  )}

                  {setor.email && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-muted-foreground">E-mail</p>
                        <a
                          href={`mailto:${setor.email}`}
                          className="font-medium text-primary hover:underline truncate block"
                          data-testid="link-email"
                        >
                          {setor.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {setor.ramal_principal && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Phone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Ramal Principal</p>
                        <p className="font-medium">{setor.ramal_principal}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Observações */}
                {setor.observacoes && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2">Observações</h3>
                      <p className="text-muted-foreground">{setor.observacoes}</p>
                    </div>
                  </>
                )}

                {/* Última Atualização */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Atualizado em:{" "}
                    {new Date(setor.ultima_atualizacao).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Responsáveis Card */}
            {setor.responsaveis && setor.responsaveis.some(r => String(r.nome || "").trim().length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Responsáveis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {setor.responsaveis.filter(r => String(r.nome || "").trim().length > 0).map((resp, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(resp.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2">
                          <p className="font-medium" data-testid={`text-responsavel-${idx}`}>
                            {adminOpen ? resp.nome : "Somente Admin"}
                          </p>
                          {!adminOpen && (
                            <Button variant="ghost" size="sm" className="h-6" onClick={() => requireAdmin()}>Desbloquear</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Contact Info */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Contatos</CardTitle>
                <div className="flex items-center gap-2">
                  {adminOpen ? (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => {
                        setIsEditing(true);
                        setForm((prev) => {
                          const hasBlank = prev.telefones.some(t => !t.numero);
                          return hasBlank ? prev : { ...prev, telefones: [...prev.telefones, { numero: "", link: "", ramal_original: "" }] };
                        });
                      }} data-testid="button-criar-contato">
                        Criar Contato
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} data-testid="button-editar-contatos">
                        Editar
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled>Somente Admin</Button>
                      <Button variant="ghost" size="sm" className="h-9" onClick={() => requireAdmin()}>Desbloquear</Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Phone Numbers */}
                {setor.telefones && setor.telefones.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Telefones</p>
                    {setor.telefones.map((tel, idx) => (
                      <Button
                        key={idx}
                        asChild
                        variant="outline"
                        className="w-full justify-start"
                        data-testid={`button-telefone-${idx}`}
                      >
                        <a href={tel.link}>
                          <Phone className="mr-2 h-4 w-4" />
                          {tel.numero}
                        </a>
                      </Button>
                    ))}
                  </div>
                )}

                {/* Ramais */}
                {setor.ramais && setor.ramais.length > 0 && (
                  <div className="space-y-2">
                    <Separator />
                    <p className="text-sm font-medium text-muted-foreground">Ramais</p>
                    <div className="space-y-2">
                      {setor.ramais.map((r, idx) => {
                        const isFav = (setor.favoritos_ramais || []).includes(r);
                        const count = (setor.acessos_ramais || {})[r] || 0;
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">{r}</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(r);
                                  const ok = await requireAdmin();
                                  if (!ok) return;
                                  recordAccess.mutate(r);
                                  toast({ title: "Ramal copiado", description: r });
                                } catch (e) {
                                  toast({ title: "Falha ao copiar", variant: "destructive" });
                                }
                              }}
                            >
                              <Copy className="mr-1 h-4 w-4" /> Copiar
                            </Button>
                            <span className="text-xs text-muted-foreground">Acessos: {count}</span>
                            <Button
                              variant={isFav ? "default" : "outline"}
                              size="sm"
                              onClick={async () => {
                                const ok = await requireAdmin();
                                if (!ok) return;
                                toggleFavorite.mutate({ numero: r, favorite: !isFav });
                              }}
                              aria-label={isFav ? "Remover favorito" : "Marcar favorito"}
                            >
                              <Star className="h-4 w-4" fill={isFav ? "currentColor" : "none"} />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {topRamais && topRamais.length > 0 && (
                  <div className="space-y-2">
                    <Separator />
                    <p className="text-sm font-medium text-muted-foreground">Mais acessados</p>
                    <div className="flex flex-wrap gap-2">
                      {topRamais.map((it, idx) => (
                        <Badge key={idx} variant="secondary" className="font-mono">
                          {it.numero} · {it.count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* WhatsApp */}
                {setor.whatsapp && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">WhatsApp</p>
                      {adminOpen ? (
                        <Button
                          asChild
                          variant="outline"
                          className="w-full justify-start text-green-600 hover:text-green-700"
                          data-testid="button-whatsapp"
                        >
                          <a href={setor.whatsapp} target="_blank" rel="noopener noreferrer">
                            <SiWhatsapp className="mr-2 h-4 w-4" />
                            Abrir WhatsApp
                            <ExternalLink className="ml-auto h-4 w-4" />
                          </a>
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button variant="outline" className="w-full justify-start" disabled>Somente Admin</Button>
                          <Button variant="ghost" size="sm" className="h-9" onClick={() => requireAdmin()}>Desbloquear</Button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Celular */}
                {setor.celular && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">Celular</p>
                      {adminOpen ? (
                        <Button
                          asChild
                          variant="outline"
                          className="w-full justify-start"
                          data-testid="button-celular"
                        >
                          <a href={`tel:${setor.celular}`}>
                            <MessageCircle className="mr-2 h-4 w-4" />
                            {setor.celular}
                          </a>
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button variant="outline" className="w-full justify-start" disabled>Somente Admin</Button>
                          <Button variant="ghost" size="sm" className="h-9" onClick={() => requireAdmin()}>Desbloquear</Button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* External Phones */}
                {setor.telefones_externos && setor.telefones_externos.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">
                        Telefones Externos
                      </p>
                      {setor.telefones_externos.map((tel, idx) => (
                        <Button
                          key={idx}
                          asChild
                          variant="outline"
                          className="w-full justify-start"
                          data-testid={`button-telefone-externo-${idx}`}
                        >
                          <a href={tel.link}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            {tel.numero}
                          </a>
                        </Button>
                      ))}
                    </div>
                  </>
                )}

                {/* Outros Contatos */}
                {setor.outros_contatos && setor.outros_contatos.length > 0 && (
                  <div className="space-y-2">
                    <Separator />
                    <p className="text-sm font-medium text-muted-foreground">Outros Contatos</p>
                    <div className="space-y-1">
                      {setor.outros_contatos.map((c, idx) => (
                        <div key={idx} className="text-sm text-muted-foreground break-all">{c}</div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Contacts Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Contatos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="edit-bloco">Bloco</label>
                <Input id="edit-bloco" value={form.bloco} onChange={(e) => setForm({ ...form, bloco: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="edit-andar">Andar</label>
                <Input id="edit-andar" value={form.andar} onChange={(e) => setForm({ ...form, andar: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="edit-email">E-mail</label>
              <Input id="edit-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="edit-ramal">Ramal principal</label>
                <Input id="edit-ramal" value={form.ramal_principal} onChange={(e) => setForm({ ...form, ramal_principal: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="edit-celular">Celular</label>
                <Input id="edit-celular" value={form.celular} onChange={(e) => setForm({ ...form, celular: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="edit-whatsapp">WhatsApp (link)</label>
                <Input id="edit-whatsapp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">Exemplo: https://wa.me/5581999999999</p>
                {errors.whatsapp && (<p className="text-xs text-destructive mt-1">{errors.whatsapp}</p>)}
              </div>
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="edit-ramais">Ramais (um por linha)</label>
                <Textarea id="edit-ramais" value={form.ramais.join("\n")} onChange={(e) => setForm({ ...form, ramais: e.target.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean) })} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Telefones</p>
                <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, telefones: [...form.telefones, { numero: "", link: "", ramal_original: "" }] })}>Adicionar</Button>
              </div>
              <div className="space-y-2">
                {form.telefones.map((t, idx) => (
                  <div key={idx} className="grid gap-2 sm:grid-cols-3">
                    <Input placeholder="Número" value={t.numero} onChange={(e) => {
                      const arr = [...form.telefones]; arr[idx] = { ...arr[idx], numero: e.target.value }; setForm({ ...form, telefones: arr });
                    }} />
                    <Input placeholder="Link" value={t.link || ""} onChange={(e) => {
                      const arr = [...form.telefones]; arr[idx] = { ...arr[idx], link: e.target.value }; setForm({ ...form, telefones: arr });
                    }} />
                    <div className="flex gap-2">
                      <Input className="flex-1" placeholder="Ramal original" value={t.ramal_original || ""} onChange={(e) => {
                        const arr = [...form.telefones]; arr[idx] = { ...arr[idx], ramal_original: e.target.value }; setForm({ ...form, telefones: arr });
                      }} />
                      <Button variant="outline" onClick={() => {
                        const arr = [...form.telefones]; arr.splice(idx, 1); setForm({ ...form, telefones: arr });
                      }}>Remover</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Telefones Externos</p>
                <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, telefones_externos: [...form.telefones_externos, { numero: "", link: "", ramal_original: "" }] })}>Adicionar</Button>
              </div>
              <div className="space-y-2">
                {form.telefones_externos.map((t, idx) => (
                  <div key={idx} className="grid gap-2 sm:grid-cols-3">
                    <Input placeholder="Número" value={t.numero} onChange={(e) => {
                      const arr = [...form.telefones_externos]; arr[idx] = { ...arr[idx], numero: e.target.value }; setForm({ ...form, telefones_externos: arr });
                    }} />
                    <Input placeholder="Link" value={t.link || ""} onChange={(e) => {
                      const arr = [...form.telefones_externos]; arr[idx] = { ...arr[idx], link: e.target.value }; setForm({ ...form, telefones_externos: arr });
                    }} />
                    <div className="flex gap-2">
                      <Input className="flex-1" placeholder="Ramal original" value={t.ramal_original || ""} onChange={(e) => {
                        const arr = [...form.telefones_externos]; arr[idx] = { ...arr[idx], ramal_original: e.target.value }; setForm({ ...form, telefones_externos: arr });
                      }} />
                      <Button variant="outline" onClick={() => {
                        const arr = [...form.telefones_externos]; arr.splice(idx, 1); setForm({ ...form, telefones_externos: arr });
                      }}>Remover</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="edit-outros">Outros contatos (um por linha)</label>
              <Textarea id="edit-outros" value={form.outros_contatos.join("\n")} onChange={(e) => setForm({ ...form, outros_contatos: e.target.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean) })} />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
              <Button onClick={async () => { const ok = await requireAdmin(); if (!ok) return; mutation.mutate(form); }} disabled={mutation.isPending || !!errors.email || !!errors.whatsapp}>Salvar</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      <BackToTop />
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Mail, Phone, ChevronRight, Users, Lock } from "lucide-react";
import { Link } from "wouter";
import type { Setor } from "@shared/schema";
import { RecentlyUpdatedBadge } from "@/components/recently-updated-badge";
import { useAdmin } from "@/components/admin-provider";

interface SetorCardProps {
  setor: Setor;
}

export function SetorCard({ setor }: SetorCardProps) {
  const { adminOpen, requireAdmin } = useAdmin();
  return (
    <Card className="hover:shadow-lg transition-all duration-200 flex flex-col min-h-[280px]" data-testid={`card-setor-${setor.id}`}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="font-mono text-xs" data-testid={`badge-sigla-${setor.id}`}>
              {setor.sigla}
            </Badge>
            {setor.bloco && (
              <Badge variant="outline" className="text-xs">
                {`Bloco ${setor.bloco}`}
              </Badge>
            )}
          </div>
          <h3 className={`font-semibold leading-tight line-clamp-2 break-words min-h-[3rem] ${setor.nome.length > 42 ? "text-sm md:text-base" : "text-base md:text-lg"}`} data-testid={`text-nome-${setor.id}`}>
            {setor.nome}
          </h3>
        </div>
        <Building2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      </CardHeader>

      <CardContent className="flex-1 space-y-3 p-4 pt-2">
        <div className="space-y-2 text-sm">
          {setor.bloco && setor.andar && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{`Bloco ${setor.bloco} - Andar ${setor.andar}`}</span>
            </div>
          )}

          {setor.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span className="truncate text-xs">{setor.email}</span>
            </div>
          )}

          {setor.ramal_principal && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span>Ramal: {setor.ramal_principal}</span>
            </div>
          )}
        </div>

        {setor.responsaveis && setor.responsaveis.some(r => String(r.nome || "").trim().length > 0) && (
          <div className="flex items-start gap-2 pt-2 border-t">
            <Users className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Responsável:</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium line-clamp-1" data-testid={`text-responsavel-${setor.id}`}>
                  {adminOpen ? (setor.responsaveis.find(r => String(r.nome || "").trim().length > 0)?.nome || "") : "Somente Admin"}
                </p>
                {!adminOpen && (
                  <Button variant="ghost" size="sm" className="h-6" onClick={() => requireAdmin()}>
                    <Lock className="h-3 w-3 mr-1" /> Desbloquear
                  </Button>
                )}
              </div>
              {setor.responsaveis.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  +{setor.responsaveis.length - 1} outro{setor.responsaveis.length > 2 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <Button
          asChild
          variant="ghost"
          className="w-full justify-between"
          data-testid={`button-ver-detalhes-${setor.id}`}
        >
          <Link href={`/setor/${setor.id}`}>
            Ver detalhes
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

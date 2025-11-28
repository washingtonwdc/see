import { Building2, Phone, Search, Users, Mail, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

export default function Sobre() {
  type VersionInfo = { version: string; env: string; serverStartedAt: string; totalSetores: number; releaseNotes?: string };
  const { data: versionInfo } = useQuery<VersionInfo>({ queryKey: ["/api/version"] });
  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">SEEPE</span>
          </div>
          <h1 className="text-4xl font-bold mb-4" data-testid="text-page-title">
            Sobre o Sistema
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Sistema de Localização de Setores da Secretaria de Educação de Pernambuco
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>O que é o SEEPE?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                O SEEPE é uma plataforma digital desenvolvida para facilitar a localização e o
                contato com os diversos setores da Secretaria de Educação de Pernambuco (SEE-PE).
              </p>
              <p>
                Com uma interface intuitiva e moderna, o sistema permite que funcionários,
                parceiros e cidadãos encontrem rapidamente informações de contato, localização
                física e responsáveis por cada setor da secretaria.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Funcionalidades Principais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <Building2 className="h-5 w-5" />
                    Busca Avançada
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Encontre setores por nome, sigla, bloco, andar ou responsável
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <Phone className="h-5 w-5" />
                    Lista Telefônica
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Acesse todos os ramais e telefones organizados de forma prática
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <MapPin className="h-5 w-5" />
                    Localização Física
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Veja em qual bloco e andar cada setor está localizado
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <Users className="h-5 w-5" />
                    Responsáveis
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Identifique quem são os responsáveis por cada setor
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <Mail className="h-5 w-5" />
                    Contatos Completos
                  </div>
                  <p className="text-sm text-muted-foreground">
                    E-mails, telefones, WhatsApp e outros canais de comunicação
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <Search className="h-5 w-5" />
                    Filtros Inteligentes
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Refine sua busca por bloco, andar e outras características
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações Técnicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-2">Tecnologias Utilizadas</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge>React</Badge>
                    <Badge>TypeScript</Badge>
                    <Badge>Tailwind CSS</Badge>
                    <Badge>Express</Badge>
                    <Badge>Node.js</Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Recursos</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Design Responsivo</Badge>
                    <Badge variant="outline">Modo Escuro</Badge>
                    <Badge variant="outline">Busca em Tempo Real</Badge>
                    <Badge variant="outline">Acessibilidade</Badge>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <strong>Última atualização dos dados:</strong> Novembro de 2025
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  O sistema é atualizado regularmente para garantir a precisão das informações.
                </p>
              </div>
            </CardContent>
          </Card>

          {versionInfo?.releaseNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Notas da Versão {versionInfo.version}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{versionInfo.releaseNotes}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Créditos e Desenvolvimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-2">Desenvolvedor</h4>
                  <p className="text-muted-foreground">Washington Dias</p>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      washingtonwdc@gmail.com
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      (81) 98558-7970
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Sobre o Projeto</h4>
                  <p className="text-muted-foreground">
                    Criado com ajuda de agentes de IA para modernizar e facilitar o acesso às informações da SEE-PE.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">
                    Secretaria de Educação de Pernambuco
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    A SEE-PE é responsável pela gestão e coordenação das políticas educacionais
                    do estado de Pernambuco, trabalhando para garantir uma educação de qualidade
                    para todos os estudantes pernambucanos.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

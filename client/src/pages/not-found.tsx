import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button asChild>
              <Link href="/">Ir para Home</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/setores">Buscar Setores</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

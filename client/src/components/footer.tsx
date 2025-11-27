import { Heart } from "lucide-react";

export function Footer() {
    return (
        <footer className="border-t py-6 md:py-8 mt-8 bg-muted/30">
            <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
                <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
                    <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                        Desenvolvido por <span className="font-medium text-foreground">Washington Dias</span>
                    </p>
                    <span className="hidden md:inline text-muted-foreground">•</span>
                    <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                        <a href="mailto:washingtonwdc@gmail.com" className="hover:underline underline-offset-4">
                            washingtonwdc@gmail.com
                        </a>
                    </p>
                    <span className="hidden md:inline text-muted-foreground">•</span>
                    <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                        (81) 98558-7970
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Criado com ajuda de agentes de IA</span>
                    <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                </div>
            </div>
        </footer>
    );
}

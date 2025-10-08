import { AuthorizationForm } from '@/components/authorization-form';
import { ThemeToggle } from '@/components/theme-toggle';
import Image from 'next/image';
import { Gift } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="relative min-h-screen bg-background flex flex-col items-center justify-center py-8 px-4 selection:bg-primary/30 selection:text-primary-foreground">
      <header className="fixed top-0 left-0 right-0 z-20 bg-card/80 backdrop-blur-sm border-b">
        <div className="container mx-auto flex items-center justify-between h-16">
           <Image 
            src="https://rihappynovo.vtexassets.com/arquivos/solzinhoFooterNew.png" 
            alt="Logo da Empresa" 
            width={50} 
            height={50} 
            className="h-12 w-auto" 
            data-ai-hint="cartoon sun character" />
          <ThemeToggle />
        </div>
      </header>

      <div className="w-full max-w-4xl pt-20">
        <div className="mb-8 text-center max-w-3xl mx-auto">
          <Gift className="mx-auto h-12 w-12 text-primary mb-4" />
          <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground text-center mb-2">
            A DIVERSÃO CONTINUA COM VOCÊ!
          </h1>
          <p className="text-lg text-muted-foreground">Preencha o Termo de Autorização se outra pessoa for retirar seu pedido.</p>
        </div>

        <AuthorizationForm />
      </div>
      
      <footer className="mt-12 text-center text-xs text-muted-foreground px-4 py-6 w-full bg-muted/50">
        <p>Ri Happy é uma empresa do Grupo Ri Happy S/A, com escritório administrativo na Av. Engenheiro Luís Carlos Berrini, 105 - Cidade Monções, – São Paulo/SP, inscrita no CNPJ 58.731.662/0001-11 - <a href="mailto:atendimento@rihappy.com.br" className="hover:underline">atendimento@rihappy.com.br</a></p>
      </footer>
    </main>
  );
}

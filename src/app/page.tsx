
import { AuthorizationForm } from '@/components/authorization-form';
import { ThemeToggle } from '@/components/theme-toggle';
import Image from 'next/image';

export default function HomePage() {
  return (
    <main className="relative min-h-screen bg-background flex flex-col items-center justify-center py-8 px-4 selection:bg-accent/50 selection:text-accent-foreground">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <header className="mb-6 text-center">
        <Image 
          src="https://rihappynovo.vtexassets.com/arquivos/solzinhoFooterNew.png" 
          alt="Logo da Empresa" 
          width={150} 
          height={150} 
          className="mx-auto mb-4" 
          data-ai-hint="cartoon sun character" />
        
        <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground text-center mb-4">
          A DIVERSÃO CONTINUA COM VOCÊ!
        </h1>
        <p className="text-xl md:text-2xl font-headline text-foreground mb-2">
          Pedido prontinho para retirada!
        </p>
      </header>

      <AuthorizationForm />
      
      <footer className="mt-12 text-center text-xs text-muted-foreground px-4">
        <p>Ri Happy é uma empresa do Grupo Ri Happy S/A, com escritório administrativo na Av. Engenheiro Luís Carlos Berrini, 105 - Cidade Monções, – São Paulo/SP, inscrita no CNPJ 58.731.662/0001-11 - atendimento@rihappy.com.br</p>
      </footer>
    </main>
  );
}

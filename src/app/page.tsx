
import { AuthorizationForm } from '@/components/authorization-form';
import Image from 'next/image';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center py-8 px-4 selection:bg-accent/50 selection:text-accent-foreground">
      <header className="mb-8 text-center">
        <Image src="/logo.png" alt="Logo da Empresa" width={160} height={56} className="mx-auto mb-6" data-ai-hint="company logo" />
        
        <p className="text-2xl md:text-3xl font-headline text-foreground mb-2">
          Pedido prontinho para retirada!
        </p>
        <h1 className="text-4xl md:text-5xl font-headline font-bold text-foreground text-center mb-6">
          A DIVERSÃO CONTINUA COM VOCÊ!
        </h1>
        
        <p className="mt-4 text-xl md:text-2xl font-headline text-foreground/80">
          Sistema de Autorização de Retirada de Pedidos
        </p>
      </header>
      <AuthorizationForm />
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} AutorizaTerceiro. Todos os direitos reservados.</p>
        <p className="mt-1">Desenvolvido para facilitar suas retiradas.</p>
      </footer>
    </main>
  );
}

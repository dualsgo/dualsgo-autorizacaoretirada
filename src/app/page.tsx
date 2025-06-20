import { AuthorizationForm } from '@/components/authorization-form';
import { Landmark } from 'lucide-react'; // Using Landmark as a placeholder for a generic "company" icon

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center py-8 px-4 selection:bg-accent/50 selection:text-accent-foreground">
      <header className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-primary rounded-full mb-4 shadow-md">
            {/* Using a generic placeholder icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground h-10 w-10">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
            </svg>
        </div>
        <h1 className="text-4xl md:text-5xl font-headline font-bold text-foreground">
          Autoriza<span className="text-primary">Terceiro</span>
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
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

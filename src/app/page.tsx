
import { AuthorizationForm } from '@/components/authorization-form';
import { ThemeToggle } from '@/components/theme-toggle';
import Image from 'next/image';

export default function HomePage() {
  return (
    <main className="relative min-h-screen bg-background flex flex-col items-center justify-center py-8 px-4 selection:bg-accent/50 selection:text-accent-foreground">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <header className="mb-8 text-center max-w-3xl">
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
        <div className="text-base md:text-lg text-foreground/90 space-y-3">
          <p>Para garantir a segurança da sua compra, preencha o Termo de Autorização caso outra pessoa vá retirar seu pedido.</p>
          <p>Essa etapa é importante para proteger sua compra e garantir que tudo ocorra da forma mais segura possível 😉</p>
          <p className="font-semibold text-amber-800 dark:text-amber-400">Atenção: você tem até 15 dias para retirar o pedido na loja escolhida. Após esse prazo, o pedido será cancelado e o pagamento estornado automaticamente.</p>
        </div>
      </header>

      <AuthorizationForm />
      
      <footer className="mt-12 text-center text-xs text-muted-foreground px-4">
        <p>Ri Happy é uma empresa do Grupo Ri Happy S/A, com escritório administrativo na Av. Engenheiro Luís Carlos Berrini, 105 - Cidade Monções, – São Paulo/SP, inscrita no CNPJ 58.731.662/0001-11 - atendimento@rihappy.com.br</p>
      </footer>
    </main>
  );
}

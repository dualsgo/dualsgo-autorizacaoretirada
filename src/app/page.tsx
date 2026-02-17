import { AuthorizationForm } from '@/components/authorization-form';
import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="bg-[#F7F7F7] min-h-screen">
      <main className="relative flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-3xl mx-auto">
          <AuthorizationForm />
        </div>
      </main>
    </div>
  );
}

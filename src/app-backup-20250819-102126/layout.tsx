import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';

const nunito = Nunito({ 
  subsets: ['latin'],
  weight: ['400', '600', '700']
});

export const metadata: Metadata = {
  title: 'AutoID+ Admin Panel',
  description: 'Admin panel for managing brands and content',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-white">
      <body className={`${nunito.className} min-h-screen flex flex-col`}>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <header className="bg-white shadow">
            <div className="px-4 py-4 sm:px-6 lg:px-8">
              <h1 className="text-4xl tracking-wide text-secondary-900">
                AutoID<sup className="align-super text-base">+</sup>{' '}
                <span className="text-yellow-400">Admin Panel</span>
              </h1>
              <div className="mt-1 text-lg text-yellow-400 font-bold">ADMIN ACCESS</div>
            </div>
          </header>
          <main className="flex-1 w-full">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

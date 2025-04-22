import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RifaBrasil | Plataforma de Rifas Online",
  description: "Participe de rifas online de forma rápida, fácil e segura com a RifaBrasil.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link 
          href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" 
          rel="stylesheet"
        />
        <style type="text/css">{`
          body {
            background-color: #f9fafb;
            color: #111827;
          }
          
          .text-important {
            color: #1f2937 !important;
          }
          
          .text-title {
            color: #374151;
            font-weight: bold;
          }
          
          .text-description {
            color: #4b5563;
          }
        `}</style>
      </head>
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Header />
          <main className="flex-grow">
            {children}
          </main>
          <footer className="bg-white border-t border-green-200 py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                <div className="flex items-center">
                  <span className="text-xl font-bold text-green-600">RifaBrasil</span>
                  <span className="ml-2 text-xs bg-yellow-400 text-green-800 px-2 py-1 rounded-full font-bold">Oficial</span>
                </div>
                <p className="text-center text-gray-500 text-sm">
                  &copy; {new Date().getFullYear()} RifaBrasil. Todos os direitos reservados.
                </p>
              </div>
            </div>
          </footer>
        </div>
        <Analytics />
      </body>
    </html>
  );
}

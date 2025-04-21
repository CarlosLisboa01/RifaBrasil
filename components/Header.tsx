'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar se o usuário está logado e se é admin
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const { data: sessionData, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Erro ao verificar sessão:", error);
          setIsLoggedIn(false);
          setIsAdmin(false);
          return;
        }
        
        const currentUser = sessionData.session?.user;
        
        if (!currentUser) {
          setIsLoggedIn(false);
          setIsAdmin(false);
          return;
        }
        
        setIsLoggedIn(true);
        
        // Verificar se é admin apenas se estiver logado
        const { data: adminData, error: adminError } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', currentUser.id);
          
        if (adminError) {
          console.error("Erro ao verificar permissões de admin:", adminError);
          setIsAdmin(false);
          return;
        }
        
        setIsAdmin(!!adminData && adminData.length > 0);
      } catch (err) {
        console.error("Erro inesperado:", err);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
    
    // Adicionar um listener para mudanças de autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      
      if (!session) {
        setIsAdmin(false);
      } else {
        // Verificar se é admin novamente
        checkAuth();
      }
    });
    
    return () => {
      // Limpar listener ao desmontar
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  return (
    <header className="bg-white shadow-sm border-t-4 border-green-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-green-600">RifaBrasil</span>
              <span className="ml-2 text-xs bg-yellow-400 text-green-800 px-2 py-1 rounded-full font-bold">Oficial</span>
            </Link>
          </div>
          
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-8">
            <Link href="/" className="px-3 py-2 rounded-md text-sm font-medium text-gray-900 hover:bg-green-50">
              Início
            </Link>
            <Link href="/participar" className="px-3 py-2 rounded-md text-sm font-medium text-gray-900 hover:bg-green-50">
              Participar
            </Link>
            
            {isLoggedIn && isAdmin && !isLoading && (
              <Link 
                href="/admin" 
                className="px-3 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700"
              >
                Administrador
              </Link>
            )}
            
            <Link 
              href={isLoggedIn ? "/minha-conta" : "/login"}
              className="ml-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              {isLoggedIn ? 'Minha Conta' : 'Entrar'}
            </Link>
          </div>
          
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500"
            >
              <span className="sr-only">Abrir menu</span>
              {isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <Link href="/" className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 hover:bg-green-50">
              Início
            </Link>
            <Link href="/participar" className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 hover:bg-green-50">
              Participar
            </Link>
            
            {isLoggedIn && isAdmin && !isLoading && (
              <Link 
                href="/admin" 
                className="block px-3 py-2 rounded-md text-base font-medium bg-red-600 text-white hover:bg-red-700"
              >
                Administrador
              </Link>
            )}
            
            <Link 
              href={isLoggedIn ? "/minha-conta" : "/login"}
              className="block w-full text-center mt-3 px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700"
            >
              {isLoggedIn ? 'Minha Conta' : 'Entrar'}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
} 
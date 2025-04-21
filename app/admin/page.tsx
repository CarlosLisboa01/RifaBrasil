'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';
import { Raffle } from '@/types';

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [raffles, setRaffles] = useState<Raffle[]>([]);

  useEffect(() => {
    const checkUser = async () => {
      try {
        // Verificar sessão do usuário
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw new Error(`Erro na autenticação: ${sessionError.message}`);
        }
        
        const currentUser = sessionData.session?.user || null;
        setUser(currentUser);
        
        if (!currentUser) {
          router.push('/login');
          return;
        }
        
        // Verificar se o usuário é administrador
        const { data: adminData, error: adminError } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', currentUser.id);
          
        if (adminError) {
          throw new Error(`Erro ao verificar permissões de administrador: ${adminError.message}`);
        }
        
        if (!adminData || adminData.length === 0) {
          // Usuário não é administrador
          setIsAdmin(false);
          return;
        }
        
        setIsAdmin(true);
        
        // Buscar todos os sorteios
        const { data: rafflesData, error: rafflesError } = await supabase
          .from('raffles')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (rafflesError) {
          throw new Error(`Erro ao buscar sorteios: ${rafflesError.message}`);
        }
        
        setRaffles(rafflesData || []);
      } catch (error: any) {
        console.error('Erro:', error);
        setError(error.message || 'Ocorreu um erro ao verificar suas permissões');
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkUser();
  }, [router]);

  const handleCreateRaffle = () => {
    router.push('/admin/sorteios/novo');
  };

  const getRaffleStatusText = (status: string): string => {
    switch (status) {
      case 'open':
        return 'Aberto';
      case 'closed':
        return 'Fechado';
      case 'completed':
        return 'Finalizado';
      default:
        return status;
    }
  };

  const getRaffleStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md border-t-4 border-green-600">
        <h1 className="text-2xl font-bold text-center mb-6 text-green-700">Acesso Restrito</h1>
        <p className="text-gray-600 mb-6 text-center">
          Você não tem permissão para acessar esta área administrativa.
        </p>
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}
        <div className="flex justify-center">
          <Link
            href="/"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Voltar para o início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mt-8 mb-12 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-green-600">Painel de Administração</h1>
          <p className="text-gray-600 mt-1">Gerencie rifas, participantes e resultados</p>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <button
            onClick={handleCreateRaffle}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Criar Nova Rifa
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden border-t-4 border-green-600">
        <div className="p-4 border-b bg-green-50">
          <h2 className="text-xl font-semibold text-green-800">Rifas</h2>
        </div>
        
        {raffles.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">Nenhuma rifa encontrada</p>
            <button
              onClick={handleCreateRaffle}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Criar Primeira Rifa
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-green-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">
                    Título
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">
                    Números
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">
                    Data de Criação
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {raffles.map((raffle) => (
                  <tr key={raffle.id} className="hover:bg-green-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{raffle.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{raffle.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRaffleStatusBadgeClass(raffle.status)}`}>
                        {getRaffleStatusText(raffle.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {raffle.min_number} a {raffle.max_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(raffle.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/admin/sorteios/${raffle.id}`}
                        className="text-green-600 hover:text-green-900 mr-4"
                      >
                        Detalhes
                      </Link>
                      
                      {raffle.status === 'open' && (
                        <Link
                          href={`/admin/sorteios/${raffle.id}/fechar`}
                          className="text-yellow-600 hover:text-yellow-900 mr-4"
                        >
                          Fechar
                        </Link>
                      )}
                      
                      {raffle.status === 'closed' && (
                        <Link
                          href={`/admin/sorteios/${raffle.id}/sorteio`}
                          className="text-green-600 hover:text-green-900"
                        >
                          Sortear
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden border-t-4 border-yellow-400">
          <div className="p-4 border-b bg-green-50">
            <h2 className="text-xl font-semibold text-green-800">Menu Rápido</h2>
          </div>
          <div className="p-4">
            <ul className="space-y-2">
              <li>
                <Link href="/admin/participantes" className="text-green-600 hover:text-green-800 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Ver Todos os Participantes
                </Link>
              </li>
              <li>
                <Link href="/admin/exportar" className="text-green-600 hover:text-green-800 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Exportar Dados
                </Link>
              </li>
              <li>
                <Link href="/admin/configuracoes" className="text-green-600 hover:text-green-800 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Configurações
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden border-t-4 border-green-600">
          <div className="p-4 border-b bg-green-50">
            <h2 className="text-xl font-semibold text-green-800">Estatísticas</h2>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4 p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <div>
                  <p className="text-sm text-gray-500">Total de Rifas</p>
                  <p className="text-xl font-bold text-gray-800">{raffles.length}</p>
                </div>
              </div>
              <Link href="/admin/sorteios" className="text-green-600 hover:text-green-800 text-sm">
                Ver todas
              </Link>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm text-gray-500">Rifas Ativas</p>
                  <p className="text-xl font-bold text-gray-800">
                    {raffles.filter(r => r.status === 'open').length}
                  </p>
                </div>
              </div>
              <Link href="/admin/sorteios?status=open" className="text-yellow-600 hover:text-yellow-800 text-sm">
                Ver ativas
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
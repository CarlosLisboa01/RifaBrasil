'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/utils/supabase';
import Link from 'next/link';

const editProfileSchema = z.object({
  name: z
    .string()
    .min(3, 'Nome completo deve ter no mínimo 3 caracteres')
    .regex(/^[A-Za-záàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ ]+$/, 'Nome deve conter apenas letras e espaços'),
  phone: z
    .string()
    .min(11, 'Telefone deve ter 11 dígitos')
    .max(11, 'Telefone deve ter 11 dígitos')
    .regex(/^\d+$/, 'Telefone deve conter apenas números'),
});

type FormValues = z.infer<typeof editProfileSchema>;

export default function EditarDadosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormValues>({
    resolver: zodResolver(editProfileSchema),
  });

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (!session) {
          router.push('/login');
          return;
        }

        // Preencher o formulário com os dados atuais do usuário
        setValue('name', session.user.user_metadata.name || '');
        setValue('phone', session.user.user_metadata.phone || '');
        
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError('Erro ao carregar seus dados. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [router, setValue]);

  const onSubmit = async (data: FormValues) => {
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(false);

      const { error } = await supabase.auth.updateUser({
        data: {
          name: data.name,
          phone: data.phone,
        }
      });

      if (error) throw error;

      setSuccess(true);
      
      // Redirecionar após 2 segundos
      setTimeout(() => {
        router.push('/minha-conta');
      }, 2000);

    } catch (error: any) {
      console.error('Erro ao atualizar dados:', error);
      setError(error.message || 'Erro ao atualizar seus dados. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 mb-10 p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-title">Editar Dados</h1>
        <Link
          href="/minha-conta"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Voltar
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
          Dados atualizados com sucesso! Redirecionando...
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-title mb-1">
            Nome Completo
          </label>
          <input
            id="name"
            type="text"
            {...register('name')}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            placeholder="Seu nome completo"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-title mb-1">
            Telefone (apenas números)
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            {...register('phone')}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            placeholder="11987654321"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">Digite apenas os números, incluindo DDD (11 dígitos)</p>
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <Link
            href="/minha-conta"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className={`px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
              submitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {submitting ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
} 
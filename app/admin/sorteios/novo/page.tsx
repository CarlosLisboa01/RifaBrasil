'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/utils/supabase';
import Image from 'next/image';

// Definição do esquema de validação
const raffleSchema = z.object({
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres'),
  description: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres'),
  min_number: z.string().min(1, 'Campo obrigatório'),
  max_number: z.string().min(1, 'Campo obrigatório'),
  unit_price: z.string().min(1, 'Valor unitário é obrigatório'),
}).refine(
  (data) => {
    const min = parseInt(data.min_number);
    const max = parseInt(data.max_number);
    return !isNaN(min) && min >= 1;
  },
  {
    message: "Número mínimo deve ser um número maior ou igual a 1",
    path: ["min_number"],
  }
).refine(
  (data) => {
    const min = parseInt(data.min_number);
    const max = parseInt(data.max_number);
    return !isNaN(max) && max >= 1;
  },
  {
    message: "Número máximo deve ser um número maior ou igual a 1",
    path: ["max_number"],
  }
).refine(
  (data) => {
    const min = parseInt(data.min_number);
    const max = parseInt(data.max_number);
    return !isNaN(min) && !isNaN(max) && max > min;
  },
  {
    message: "O número máximo deve ser maior que o número mínimo",
    path: ["max_number"],
  }
).refine(
  (data) => {
    const price = parseFloat(data.unit_price.replace(',', '.'));
    return !isNaN(price) && price > 0;
  },
  {
    message: "O valor unitário deve ser um número maior que zero",
    path: ["unit_price"],
  }
);

type FormValues = z.infer<typeof raffleSchema>;

export default function NovoSorteioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(raffleSchema),
    defaultValues: {
      title: '',
      description: '',
      min_number: '1',
      max_number: '100',
      unit_price: '10,00',
    },
  });

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const currentUser = sessionData.session?.user || null;
        
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
          console.error("Erro ao verificar permissões:", adminError);
          router.push('/login');
          return;
        }
        
        if (!adminData || adminData.length === 0) {
          router.push('/login');
          return;
        }
        
        setIsAdmin(true);
      } catch (error: any) {
        console.error('Erro:', error);
        setError(error.message || 'Ocorreu um erro ao verificar suas permissões');
      } finally {
        setLoading(false);
      }
    };
    
    checkAdmin();
  }, [router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    // Verificar se é uma imagem
    if (!file.type.match(/^image\/(jpeg|jpg|png|gif)$/)) {
      setError('Por favor, selecione uma imagem válida (JPEG, PNG ou GIF).');
      return;
    }

    // Verificar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem não pode ter mais de 5MB.');
      return;
    }

    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const clearImageSelection = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (formData: FormValues) => {
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      
      // Converter strings para números
      const min_number = parseInt(formData.min_number);
      const max_number = parseInt(formData.max_number);
      const unit_price = parseFloat(formData.unit_price.replace(',', '.'));
      
      let image_url = null;
      
      // Upload da imagem, se existir
      if (imageFile) {
        try {
          // Gerar nome único para o arquivo
          const fileName = Date.now() + '_' + imageFile.name.replace(/\s+/g, '_');
          
          // Fazer o upload diretamente sem verificações adicionais
          const { data, error: uploadError } = await supabase.storage
            .from('raffle-images')
            .upload(fileName, imageFile, {
              cacheControl: '3600',
              upsert: false
            });
            
          if (uploadError) {
            throw new Error(`Erro ao fazer upload da imagem: ${uploadError.message}`);
          }
          
          // Obter URL pública
          const { data: { publicUrl } } = supabase.storage
            .from('raffle-images')
            .getPublicUrl(fileName);
          
          image_url = publicUrl;
        } catch (error: any) {
          console.error('Erro de upload:', error);
          setError(`Erro no upload da imagem: ${error.message}. Prosseguindo sem imagem.`);
          // Continuar sem a imagem
        }
      }
      
      // Criar a rifa no banco de dados
      const { data: newRaffle, error } = await supabase
        .from('raffles')
        .insert({
          title: formData.title,
          description: formData.description,
          min_number,
          max_number,
          unit_price,
          image_url,
          status: 'open',
        })
        .select()
        .single();
        
      if (error) {
        // Se falhar por causa de um campo ausente, tente novamente sem ele
        if (error.message.includes('unit_price')) {
          // Tentar novamente sem unit_price
          const { data: fallbackRaffle, error: fallbackError } = await supabase
            .from('raffles')
            .insert({
              title: formData.title,
              description: formData.description,
              min_number,
              max_number,
              status: 'open',
              image_url,
            })
            .select()
            .single();
            
          if (fallbackError) throw fallbackError;
          
          setSuccess('Rifa criada com sucesso (sem valor unitário - adicione a coluna unit_price na tabela)');
          
          // Redirecionar para a página de detalhes
          setTimeout(() => {
            router.push('/admin/sorteios/' + fallbackRaffle.id);
          }, 2000);
          return;
        }
        
        throw error;
      }
      
      setSuccess('Rifa criada com sucesso!');
      
      // Redirecionar para a página de detalhes do sorteio
      setTimeout(() => {
        router.push('/admin/sorteios/' + newRaffle.id);
      }, 2000);
      
    } catch (error: any) {
      console.error('Erro ao criar rifa:', error);
      setError(error.message || 'Erro ao criar a rifa');
    } finally {
      setSubmitting(false);
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
          Você não tem permissão para acessar esta área.
        </p>
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
    <div className="max-w-2xl mx-auto mt-8 mb-12 px-4">
      <div className="flex items-center mb-6">
        <Link href="/admin" className="text-green-600 hover:text-green-800 mr-2">
          &larr; Voltar ao Painel
        </Link>
        <h1 className="text-2xl font-bold text-green-600 ml-2">Criar Nova Rifa</h1>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-md">
          {success}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden border-t-4 border-green-600">
        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Título da Rifa *
              </label>
              <input
                id="title"
                type="text"
                {...register('title')}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                placeholder="Ex: Rifa de Natal 2023"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Descrição da Rifa *
              </label>
              <textarea
                id="description"
                {...register('description')}
                rows={4}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                placeholder="Descreva os detalhes da rifa, prêmios, regras, etc."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imagem da Rifa
              </label>
              <div className="mt-1 flex items-center space-x-4">
                <div
                  className={`flex justify-center items-center w-32 h-32 border-2 border-dashed rounded-md 
                    ${imagePreview ? 'border-green-300' : 'border-gray-300 hover:border-green-400'} 
                    ${!imagePreview ? 'cursor-pointer' : ''}`}
                  onClick={() => !imagePreview && fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <div className="relative w-full h-full">
                      <Image 
                        src={imagePreview} 
                        alt="Preview" 
                        fill 
                        className="object-cover rounded-md"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1 text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p className="text-xs text-gray-500">Clique para adicionar</p>
                    </div>
                  )}
                </div>
                
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg, image/png, image/gif"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                />
                
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    {imagePreview ? 'Trocar Imagem' : 'Selecionar Imagem'}
                  </button>
                  
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={clearImageSelection}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Remover
                    </button>
                  )}
                  
                  <p className="text-xs text-gray-500">
                    JPG, PNG ou GIF. Máximo 5MB.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="min_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Número Mínimo *
                </label>
                <input
                  id="min_number"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  {...register('min_number')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
                {errors.min_number && (
                  <p className="mt-1 text-sm text-red-600">{errors.min_number.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="max_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Número Máximo *
                </label>
                <input
                  id="max_number"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  {...register('max_number')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
                {errors.max_number && (
                  <p className="mt-1 text-sm text-red-600">{errors.max_number.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="unit_price" className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Unitário (R$) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">R$</span>
                  </div>
                  <input
                    id="unit_price"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    {...register('unit_price')}
                    className="block w-full pl-11 pr-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  />
                </div>
                {errors.unit_price && (
                  <p className="mt-1 text-sm text-red-600">{errors.unit_price.message}</p>
                )}
              </div>
            </div>
            
            <div className="border-t pt-4">
              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3 px-4 rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                  submitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {submitting ? 'Criando...' : 'Criar Rifa'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/utils/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { Raffle } from '@/types';

const participationSchema = z.object({
  chosenNumbers: z
    .string()
    .min(1, 'É necessário escolher pelo menos um número')
    .refine((val) => {
      const numbers = val.split(',').map(n => n.trim());
      return numbers.length > 0 && numbers.every(n => !isNaN(Number(n)));
    }, { message: 'Números inválidos. Insira números separados por vírgula.' }),
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  phone: z.string()
    .min(10, 'Telefone deve ter pelo menos 10 dígitos')
    .refine((val) => {
      // Remover caracteres não numéricos e verificar se tem pelo menos 10 dígitos
      const numbersOnly = val.replace(/\D/g, '');
      return numbersOnly.length >= 10 && numbersOnly.length <= 11;
    }, { message: 'Telefone deve conter entre 10 e 11 dígitos numéricos' })
});

type FormValues = z.infer<typeof participationSchema>;

export default function ParticiparPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [availableRaffles, setAvailableRaffles] = useState<Raffle[]>([]);
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);
  const [randomQuantity, setRandomQuantity] = useState<number>(1);
  const [availableNumbers, setAvailableNumbers] = useState<number[]>([]);
  const [totalValue, setTotalValue] = useState<number>(0);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(participationSchema),
    defaultValues: {
      chosenNumbers: '',
      name: '',
      phone: ''
    },
  });

  // Observar mudanças nos números escolhidos para atualizar o valor total
  const chosenNumbers = watch('chosenNumbers');

  // Quando o usuário for carregado, preencher os campos de nome e telefone
  useEffect(() => {
    if (user) {
      setValue('name', user.user_metadata?.name || '');
      setValue('phone', user.user_metadata?.phone || '');
    }
  }, [user, setValue]);

  useEffect(() => {
    if (selectedRaffle?.unit_price && chosenNumbers) {
      const numbers = chosenNumbers.split(',').filter(n => n.trim() !== '');
      const total = numbers.length * selectedRaffle.unit_price;
      setTotalValue(total);
    } else {
      setTotalValue(0);
    }
  }, [chosenNumbers, selectedRaffle?.unit_price]);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
      setLoading(false);
      
      if (!data.session) {
        router.push('/login');
      }
    };
    
    const fetchRaffles = async () => {
      const { data, error } = await supabase
        .from('raffles')
        .select('*')
        .eq('status', 'open');
        
      if (error) {
        console.error('Erro ao buscar sorteios:', error);
        return;
      }
      
      setAvailableRaffles(data || []);
      if (data && data.length > 0) {
        setSelectedRaffle(data[0]);
        // Após selecionar o sorteio, buscar os números disponíveis
        await fetchAvailableNumbers(data[0]);
      }
    };
    
    checkUser();
    fetchRaffles();
  }, [router]);

  // Função para buscar números disponíveis do sorteio selecionado
  const fetchAvailableNumbers = async (raffle: Raffle) => {
    if (!raffle) return;
    
    try {
      // Buscar números já escolhidos na tabela de participantes confirmados
      const { data: existingParticipants, error: participantsError } = await supabase
        .from('participants')
        .select('chosen_numbers')
        .eq('raffle_id', raffle.id);
        
      if (participantsError) throw participantsError;
      
      // Buscar números em participações pendentes
      const { data: pendingParticipations, error: pendingError } = await supabase
        .from('participations_pending')
        .select('chosen_numbers')
        .eq('raffle_id', raffle.id)
        .eq('status', 'pending');
        
      if (pendingError) throw pendingError;
      
      // Criar um array com todos os números possíveis
      const allNumbers: number[] = [];
      for (let i = raffle.min_number; i <= raffle.max_number; i++) {
        allNumbers.push(i);
      }
      
      // Combinar os números já escolhidos de ambas as tabelas
      const chosenNumbers = [
        ...(existingParticipants?.flatMap(p => p.chosen_numbers) || []),
        ...(pendingParticipations?.flatMap(p => p.chosen_numbers) || [])
      ];
      
      // Filtrar apenas os números disponíveis
      const available = allNumbers.filter(num => !chosenNumbers.includes(num));
      
      setAvailableNumbers(available);
    } catch (error) {
      console.error('Erro ao buscar números disponíveis:', error);
    }
  };

  // Função para gerar números aleatórios
  const generateRandomNumbers = () => {
    if (!selectedRaffle || randomQuantity <= 0 || availableNumbers.length === 0) {
      setMessage({
        type: 'error',
        text: 'Não foi possível gerar números aleatórios. Verifique a quantidade solicitada.'
      });
      return;
    }
    
    // Verificar se há números suficientes disponíveis
    if (randomQuantity > availableNumbers.length) {
      setMessage({
        type: 'error',
        text: `Só há ${availableNumbers.length} números disponíveis. Escolha uma quantidade menor.`
      });
      return;
    }
    
    // Embaralhar e pegar os primeiros N números
    const shuffled = [...availableNumbers].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, randomQuantity);
    
    // Ordenar os números selecionados
    selected.sort((a, b) => a - b);
    
    // Atualizar o campo no formulário
    setValue('chosenNumbers', selected.join(', '));
  };

  // Quando o sorteio for alterado, buscar números disponíveis
  useEffect(() => {
    if (selectedRaffle) {
      fetchAvailableNumbers(selectedRaffle);
    }
  }, [selectedRaffle]);

  const validateChosenNumbers = (numbersStr: string, raffle: Raffle) => {
    const numbers = numbersStr.split(',').map(n => parseInt(n.trim(), 10));
    
    // Verificar se todos os números estão dentro do intervalo
    const validRange = numbers.every(n => n >= raffle.min_number && n <= raffle.max_number);
    if (!validRange) {
      return `Os números devem estar entre ${raffle.min_number} e ${raffle.max_number}`;
    }
    
    // Verificar se há números duplicados
    const uniqueNumbers = new Set(numbers);
    if (uniqueNumbers.size !== numbers.length) {
      return 'Não são permitidos números duplicados';
    }
    
    return null;
  };

  // Função para formatar o número de telefone com máscara brasileira
  const formatPhoneNumber = (value: string) => {
    // Remove todos os caracteres não numéricos
    const numbersOnly = value.replace(/\D/g, '');
    
    // Aplica a máscara de acordo com o tamanho
    if (numbersOnly.length <= 10) {
      // Formato (XX) XXXX-XXXX para telefones com 10 dígitos ou menos
      return numbersOnly
        .replace(/(\d{2})/, '($1) ')
        .replace(/(\d{2})\s(\d{4})/, '$1 $2-')
        .replace(/(\d{2})\s(\d{4})-(\d{0,4})/, '$1 $2-$3');
    } else {
      // Formato (XX) XXXXX-XXXX para telefones com 11 dígitos (celular)
      return numbersOnly
        .replace(/(\d{2})/, '($1) ')
        .replace(/(\d{2})\s(\d{5})/, '$1 $2-')
        .replace(/(\d{2})\s(\d{5})-(\d{0,4})/, '$1 $2-$3');
    }
  };

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    setMessage(null);
    
    try {
      // Converter a string de números escolhidos para um array de números inteiros
      const chosenNumbersArray = data.chosenNumbers
        .split(',')
        .map(n => parseInt(n.trim(), 10))
        .filter(n => !isNaN(n));
      
      if (chosenNumbersArray.length === 0) {
        throw new Error('Selecione pelo menos um número para participar');
      }
      
      // Verificar novamente se os números escolhidos estão disponíveis
      const { data: existingParticipants, error: participantsError } = await supabase
        .from('participants')
        .select('chosen_numbers')
        .eq('raffle_id', selectedRaffle?.id);
        
      if (participantsError) throw new Error('Erro ao verificar números disponíveis');
      
      // Buscar números em participações pendentes
      const { data: pendingParticipations, error: pendingError } = await supabase
        .from('participations_pending')
        .select('chosen_numbers')
        .eq('raffle_id', selectedRaffle?.id)
        .eq('status', 'pending');
        
      if (pendingError) throw new Error('Erro ao verificar participações pendentes');
      
      // Combinar todos os números já escolhidos
      const allChosenNumbers = [
        ...(existingParticipants?.flatMap(p => p.chosen_numbers) || []),
        ...(pendingParticipations?.flatMap(p => p.chosen_numbers) || [])
      ];
      
      // Verificar se algum dos números selecionados já foi escolhido
      const unavailableNumbers = chosenNumbersArray.filter(num => allChosenNumbers.includes(num));
      
      if (unavailableNumbers.length > 0) {
        throw new Error(`Os seguintes números já foram escolhidos por outro participante: ${unavailableNumbers.join(', ')}. Por favor, escolha outros números.`);
      }

      // Continuar com o processo de envio
      const participationData = {
        user_id: user?.id,
        name: data.name,
        phone: data.phone.replace(/\D/g, ''), // Remover caracteres não numéricos
        chosen_numbers: chosenNumbersArray,
        raffle_id: selectedRaffle?.id,
        status: 'pending',
      };
      
      const response = await fetch('/api/pagamento/preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participation: participationData,
          unit_price: selectedRaffle?.unit_price || 0,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Erro ao criar preferência de pagamento');
      }
      
      const { preferenceId, participation_id, init_point } = await response.json();
      
      // Se tiver o link de pagamento direto, redirecionar para lá
      if (init_point) {
        window.location.href = init_point;
      } else {
        // Caso contrário, redirecionar para nossa página de pagamento
        router.push(`/pagamento?preference_id=${preferenceId}&participation_id=${participation_id}`);
      }
      
    } catch (error: any) {
      console.error('Erro ao participar:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Ocorreu um erro ao processar sua participação. Tente novamente.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">Faça login para participar</h1>
        <Link 
          href="/login"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-8 mb-12 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center text-green-600 mb-6">Participar do Sorteio</h1>
      
      {availableRaffles.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-lg text-gray-600 mb-4">Não há sorteios disponíveis no momento.</p>
          <Link
            href="/"
            className="text-green-600 hover:text-green-800 font-medium"
          >
            Voltar para a página inicial
          </Link>
        </div>
      ) : (
        <>
          {message && (
            <div 
              className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              dangerouslySetInnerHTML={{ __html: message.text }}
            >
            </div>
          )}
          
          <div className="mb-6">
            <label htmlFor="raffle" className="block text-sm font-medium text-title mb-1">Selecionar Sorteio</label>
            <select
              id="raffle"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-important"
              onChange={(e) => {
                const selected = availableRaffles.find(r => r.id === e.target.value);
                setSelectedRaffle(selected || null);
              }}
              value={selectedRaffle?.id || ''}
            >
              {availableRaffles.map((raffle) => (
                <option key={raffle.id} value={raffle.id} className="text-important">
                  {raffle.title}
                </option>
              ))}
            </select>
          </div>
          
          {selectedRaffle && (
            <div className="mb-6 p-4 bg-green-50 rounded-md border border-green-200">
              <h2 className="font-bold text-lg mb-2 text-title">{selectedRaffle.title}</h2>
              
              {selectedRaffle.image_url && (
                <div className="mb-4 relative">
                  <div className="relative w-full h-48 mb-3 overflow-hidden rounded-lg">
                    <Image 
                      src={selectedRaffle.image_url}
                      alt={selectedRaffle.title}
                      fill
                      style={{ objectFit: 'cover' }}
                      className="rounded-lg"
                    />
                  </div>
                </div>
              )}
              
              <p className="text-sm text-description mb-3">{selectedRaffle.description}</p>
              
              <div className="flex flex-wrap items-center justify-between mb-3 p-3 bg-white rounded-md shadow-sm">
                <div className="flex items-center">
                  <span className="font-medium text-title mr-2">Números disponíveis:</span> 
                  <span className="font-bold text-important">{selectedRaffle.min_number} a {selectedRaffle.max_number}</span>
                </div>
                
                {selectedRaffle.unit_price !== undefined && (
                  <div className="ml-auto mt-2 sm:mt-0">
                    <span className="px-3 py-1 bg-yellow-100 text-black font-bold rounded-full">
                      Valor por número: R$ {typeof selectedRaffle.unit_price === 'number' 
                        ? selectedRaffle.unit_price.toFixed(2).replace('.', ',') 
                        : selectedRaffle.unit_price}
                    </span>
                  </div>
                )}
              </div>

              {/* Exibição do valor total */}
              {totalValue > 0 && (
                <div className="mt-3 p-3 bg-green-100 rounded-md">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium text-green-800">Quantidade de números:</span>
                      <span className="ml-2 font-bold text-green-800">
                        {chosenNumbers.split(',').filter(n => n.trim() !== '').length}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-green-800">Valor total:</span>
                      <span className="ml-2 font-bold text-green-800">
                        R$ {totalValue.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-title mb-1">
                Seu Nome
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
                Seu Telefone
              </label>
              <input
                id="phone"
                type="tel"
                {...register('phone')}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                placeholder="(00) 00000-0000"
                onChange={(e) => {
                  const formattedValue = formatPhoneNumber(e.target.value);
                  e.target.value = formattedValue;
                  setValue('phone', formattedValue, { shouldValidate: true });
                }}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="chosenNumbers" className="block text-sm font-medium text-title mb-1">
                Números escolhidos (separados por vírgula)
              </label>
              <input
                id="chosenNumbers"
                type="text"
                {...register('chosenNumbers')}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                placeholder="1, 5, 10, 25, 50"
              />
              <p className="mt-1 text-xs text-gray-500">
                Escolha números entre {selectedRaffle?.min_number} e {selectedRaffle?.max_number}, separados por vírgula.
              </p>
              {errors.chosenNumbers && (
                <p className="mt-1 text-sm text-red-600">{errors.chosenNumbers.message}</p>
              )}
            </div>
            
            {/* Gerador de números aleatórios */}
            <div className="bg-green-50 p-4 rounded-md border border-green-200">
              <h3 className="text-sm font-medium text-green-800 mb-2">Gerador de números aleatórios</h3>
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <label htmlFor="randomQuantity" className="block text-xs text-gray-500 mb-1">
                    Quantidade de números
                  </label>
                  <input
                    id="randomQuantity"
                    type="number"
                    min="1"
                    max={availableNumbers.length}
                    value={randomQuantity}
                    onChange={(e) => {
                      const value = e.target.value === '' ? '' : parseInt(e.target.value);
                      if (value === '') {
                        setRandomQuantity(1); // Padrão para 1 quando estiver vazio
                      } else {
                        const numValue = parseInt(value.toString());
                        // Permitir valores entre 1 e o número máximo disponível
                        if (!isNaN(numValue)) {
                          const finalValue = Math.min(Math.max(1, numValue), availableNumbers.length);
                          setRandomQuantity(finalValue);
                        }
                      }
                    }}
                    onFocus={(e) => e.target.select()} // Seleciona todo o texto ao focar
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={generateRandomNumbers}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm mt-3"
                >
                  Gerar
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {availableNumbers.length > 0 
                  ? `${availableNumbers.length} números disponíveis para sorteio.` 
                  : 'Carregando números disponíveis...'}
              </p>
            </div>
            
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                submitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {submitting ? 'Processando...' : 'Confirmar Participação'}
            </button>
          </form>
        </>
      )}
    </div>
  );
} 
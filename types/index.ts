export interface User {
  id: string;
  email: string;
}

export interface Participant {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  chosen_numbers: number[];
  created_at: string;
  raffle_id: string;
  raffles?: Raffle;
}

export interface Raffle {
  id: string;
  title: string;
  description: string;
  min_number: number;
  max_number: number;
  status: 'open' | 'closed' | 'completed';
  winner_id?: string;
  created_at: string;
  drawn_at?: string;
  unit_price: number;
  image_url?: string;
}

export interface AdminUser extends User {
  is_admin: boolean;
} 
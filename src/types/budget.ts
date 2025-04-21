export interface Budget {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface BudgetUser {
  budget_id: string;
  user_id: string;
  role: 'owner' | 'member';
}

export interface Category {
  id: string;
  name: string;
  amount: number;
  timeframe: 'weekly' | 'monthly' | 'yearly';
  budget_id: string;
  total_spent?: number;
}
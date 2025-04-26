import { Category } from './category';

export interface Budget {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;

  categories?: Category[];
}

export interface BudgetUser {
  budget_id: string;
  user_id: string;
  role: 'owner' | 'member';
}

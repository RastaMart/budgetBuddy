export interface Transaction {
  id: string;
  category_id: string;
  amount: number;
  description: string;
  date: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface TransactionWithCategory extends Transaction {
  category: {
    name: string;
    budget_id: string;
    timeframe: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
    type: 'income' | 'spending' | 'shared_income';
  };
}

export interface CreateTransactionParams {
  category_id: string;
  amount: number;
  description: string;
  date: string;
  user_id: string;
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  categoryIds?: string[];
  budgetId?: string;
  minAmount?: number;
  maxAmount?: number;
}

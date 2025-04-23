export interface Category {
  id: string;
  name: string;
  amount: number;
  timeframe: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  type: 'spending' | 'income' | 'shared_income';
  amount_type: 'fixed' | 'flexible';
  total_spent?: number;
}

export interface CategoryAllocation {
  id: string;
  category_id: string;
  allocation_type: 'manual' | 'dynamic';
  percentage?: number;
  reference_category_id?: string;
}

export interface SharedIncomeAllocation {
  name: string;
  percentage: number;
  isManual: boolean;
  referenceCategory?: Category;
}
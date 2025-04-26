import { Budget } from './budget';

export interface Category {
  id: string;
  name: string;
  amount: number;
  timeframe: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  type: 'spending' | 'income' | 'shared_income';
  amount_type: 'fixed' | 'flexible';
  total_spent?: number;
  allocations: SharedIncomeAllocation[];
  allocation_type: 'manual' | 'dynamic';

  budget?: Budget;
  budget_id: string;
}
export interface RefCategory {
  id: string;
  budget_id: string;
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
  referenceCategory?: RefCategory;
  transactionTotal?: number;
}

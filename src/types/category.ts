export interface Category {
  id: string;
  name: string;
  amount: number;
  timeframe: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  type: 'spending' | 'income';
  amount_type: 'fixed' | 'flexible';
  total_spent?: number;
}
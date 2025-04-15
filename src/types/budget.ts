export interface Budget {
  id: string;
  name: string;
  amount: number;
  timeframe: 'weekly' | 'monthly' | 'yearly';
  total_spent?: number;
}
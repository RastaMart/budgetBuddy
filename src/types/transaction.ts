export type TransactionType = 'account' | 'virtual' | 'income_distribution';

export interface RawTransaction {
  amount: number;
  incomeAmount: number;
  expenseAmount: number;
  description: string;
  date: string;
  isDuplicate?: boolean;
  selected?: boolean;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  account_id: string | null;
  amount: number;
  description: string;
  date: string;
  assigned_date: string;
  type: TransactionType;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
  category?: {
    name: string;
    budget?: {
      name: string;
    };
  };
  account?: {
    name: string;
    icon: string;
  };
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  accountId?: string;
  categoryIds?: string[];
  type?: TransactionType[];
}

export interface CreateTransactionInput {
  category_id?: string;
  account_id?: string;
  amount: number;
  description: string;
  date: string;
  type: TransactionType;
  note?: string;
}

export interface TransactionsImportError {
  row: number;
  error: string;
  data: RawTransaction;
}

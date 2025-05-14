import { RawTransaction } from './transaction';

export interface ColumnMapping {
  date?: number;
  description?: number;
  amount?: number;
  incomeAmount?: number;
  expenseAmount?: number;
  type?: number;
}

export interface CsvProcessResult {
  success: boolean;
  rawTransactions?: RawTransaction[];
  formatSignature?: string;
  mapping?: ColumnMapping;
  confidence: number;
  mappedFrom?: 'Cache' | 'Heuristic' | 'User';
  errorMessage?: string;
}

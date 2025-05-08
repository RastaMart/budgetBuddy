export interface CSVPreview {
  headers: string[];
  rows: string[][];
}

export interface CSVTransaction {
  date: string;
  description: string;
  amount: string;
  isDuplicate?: boolean;
  selected?: boolean;
}

export interface ImportError {
  row: number;
  error: string;
  data: CSVTransaction;
}
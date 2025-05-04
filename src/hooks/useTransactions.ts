import { useState, useEffect } from 'react';
import { useAuth } from './useContext';
import { Transaction, TransactionFilters } from '../types/transaction';
import * as transactionService from '../services/transactionService';

export function useTransactions(filters?: TransactionFilters) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchTransactions();
  }, [user, filters]);

  async function fetchTransactions() {
    try {
      setIsLoading(true);
      setError(null);
      const data = await transactionService.fetchTransactions(user!.id, filters);
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch transactions'));
    } finally {
      setIsLoading(false);
    }
  }

  async function createTransaction(transaction: Partial<Transaction>) {
    try {
      await transactionService.createTransaction({
        ...transaction,
        user_id: user!.id,
      });
      await fetchTransactions();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create transaction'));
      throw err;
    }
  }

  async function updateTransaction(id: string, updates: Partial<Transaction>) {
    try {
      await transactionService.updateTransaction(id, updates);
      await fetchTransactions();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update transaction'));
      throw err;
    }
  }

  async function deleteTransaction(id: string) {
    try {
      await transactionService.deleteTransaction(id);
      await fetchTransactions();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete transaction'));
      throw err;
    }
  }

  return {
    transactions,
    isLoading,
    error,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    refresh: fetchTransactions,
  };
}
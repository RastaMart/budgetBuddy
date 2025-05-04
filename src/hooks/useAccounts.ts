import { useState, useEffect } from 'react';
import { useAuth } from './useContext';
import { Account, CreateAccountParams } from '../types/account';
import * as accountService from '../services/accountService';

export function useAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchAccounts();
  }, [user]);

  async function fetchAccounts() {
    try {
      setIsLoading(true);
      setError(null);
      const data = await accountService.fetchAccounts(user!.id);
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch accounts'));
    } finally {
      setIsLoading(false);
    }
  }

  async function createAccount(account: CreateAccountParams) {
    try {
      await accountService.createAccount(user!.id, account);
      await fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create account'));
      throw err;
    }
  }

  async function updateAccount(id: string, updates: Partial<Account>) {
    try {
      await accountService.updateAccount(id, updates);
      await fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update account'));
      throw err;
    }
  }

  async function deleteAccount(id: string) {
    try {
      await accountService.deleteAccount(id);
      await fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete account'));
      throw err;
    }
  }

  return {
    accounts,
    isLoading,
    error,
    createAccount,
    updateAccount,
    deleteAccount,
    refresh: fetchAccounts,
  };
}
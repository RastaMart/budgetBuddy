import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useContext';
import { Account, CreateAccountParams } from '../types/account';
import * as accountService from '../services/accountService';

function useAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Memoize userId to avoid unnecessary effect triggers
  const userId = user?.id;

  // Use useCallback to avoid recreating this function on every render
  const fetchAccounts = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await accountService.fetchAccounts(userId);
      setAccounts(data);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to fetch accounts')
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Run effect only when userId or fetchAccounts changes
  useEffect(() => {
    if (userId) {
      fetchAccounts();
    }
  }, [userId, fetchAccounts]);

  const createAccount = useCallback(
    async (account: CreateAccountParams) => {
      if (!userId) return;

      try {
        await accountService.createAccount(userId, account);
        // Instead of calling fetchAccounts, update the state directly when possible
        // await fetchAccounts();
        const data = await accountService.fetchAccounts(userId);
        setAccounts(data);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Failed to create account')
        );
        throw err;
      }
    },
    [userId]
  );

  const updateAccount = useCallback(
    async (id: string, updates: Partial<Account>) => {
      try {
        await accountService.updateAccount(id, updates);
        // Optimistic update to reduce re-renders
        setAccounts((prevAccounts) =>
          prevAccounts.map((account) =>
            account.id === id ? { ...account, ...updates } : account
          )
        );
        // Fetch to ensure consistency
        fetchAccounts();
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Failed to update account')
        );
        throw err;
      }
    },
    [fetchAccounts]
  );

  const deleteAccount = useCallback(
    async (id: string) => {
      try {
        await accountService.deleteAccount(id);
        // Optimistic update
        setAccounts((prevAccounts) =>
          prevAccounts.filter((account) => account.id !== id)
        );
        // Fetch to ensure consistency
        fetchAccounts();
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Failed to delete account')
        );
        throw err;
      }
    },
    [fetchAccounts]
  );

  // Memoize the return value to prevent unnecessary re-renders
  const returnValue = useMemo(
    () => ({
      accounts,
      isLoading,
      error,
      createAccount,
      updateAccount,
      deleteAccount,
      refresh: fetchAccounts,
    }),
    [
      accounts,
      isLoading,
      error,
      createAccount,
      updateAccount,
      deleteAccount,
      fetchAccounts,
    ]
  );

  return returnValue;
}

export { useAccounts };

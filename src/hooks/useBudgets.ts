import { useState, useEffect } from 'react';
import { useAuth } from './useContext';
import { Budget } from '../types/budget';
import * as budgetService from '../services/budgetService';

export function useBudgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchBudgets();
  }, [user]);

  async function fetchBudgets() {
    try {
      setIsLoading(true);
      setError(null);
      const data = await budgetService.fetchBudgets(user!.id);
      setBudgets(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch budgets'));
    } finally {
      setIsLoading(false);
    }
  }

  async function createBudget(name: string) {
    try {
      await budgetService.createBudget(name);
      await fetchBudgets();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create budget'));
      throw err;
    }
  }

  async function updateBudget(id: string, updates: Partial<Budget>) {
    try {
      await budgetService.updateBudget(id, updates);
      await fetchBudgets();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update budget'));
      throw err;
    }
  }

  async function deleteBudget(id: string) {
    try {
      await budgetService.deleteBudget(id);
      await fetchBudgets();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete budget'));
      throw err;
    }
  }

  async function reorderBudgets(newOrder: Budget[]) {
    try {
      setBudgets(newOrder);
      await budgetService.updateBudgetOrder(newOrder);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to reorder budgets'));
      await fetchBudgets(); // Revert to original order on error
      throw err;
    }
  }

  return {
    budgets,
    isLoading,
    error,
    createBudget,
    updateBudget,
    deleteBudget,
    reorderBudgets,
    refresh: fetchBudgets,
  };
}
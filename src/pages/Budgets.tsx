import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, X } from 'lucide-react';
import { Budget } from '../types/budget';
import { BudgetSection } from '../components/budget/BudgetSection';
import { AddBudgetForm } from '../components/budget/AddBudgetForm';

export function Budgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    timeframe: 'monthly' as 'weekly' | 'monthly' | 'yearly',
  });

  useEffect(() => {
    fetchBudgets();
    // Refresh data every minute to keep progress bars updated
    const interval = setInterval(fetchBudgets, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchBudgets() {
    try {
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (budgetsError) throw budgetsError;

      const budgetsWithSpending = await Promise.all(
        (budgetsData || []).map(async (budget) => {
          const { data: transactionsData, error: transactionsError } = await supabase
            .from('transactions')
            .select('amount')
            .eq('budget_id', budget.id);

          if (transactionsError) throw transactionsError;

          const totalSpent = (transactionsData || []).reduce(
            (sum, transaction) => sum + Number(transaction.amount),
            0
          );

          return {
            ...budget,
            total_spent: totalSpent,
          };
        })
      );

      setBudgets(budgetsWithSpending);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { error } = await supabase.from('budgets').insert({
        user_id: user.id,
        name: formData.name,
        amount: parseFloat(formData.amount),
        timeframe: formData.timeframe,
      });

      if (error) throw error;

      setFormData({
        name: '',
        amount: '',
        timeframe: 'monthly',
      });
      setShowForm(false);
      fetchBudgets();
    } catch (error) {
      console.error('Error adding budget:', error);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchBudgets();
    } catch (error) {
      console.error('Error deleting budget:', error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Budgets</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {showForm ? (
            <>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Add Budget
            </>
          )}
        </button>
      </div>

      {showForm && (
        <AddBudgetForm
          formData={formData}
          onSubmit={handleSubmit}
          onChange={(data) => setFormData({ ...formData, ...data })}
        />
      )}

      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          Loading budgets...
        </div>
      ) : budgets.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          No budgets found
        </div>
      ) : (
        <div className="space-y-6">
          <BudgetSection 
            budgets={budgets} 
            timeframe="weekly" 
            onDelete={handleDelete} 
            onTransactionAdded={fetchBudgets}
          />
          <BudgetSection 
            budgets={budgets} 
            timeframe="monthly" 
            onDelete={handleDelete} 
            onTransactionAdded={fetchBudgets}
          />
          <BudgetSection 
            budgets={budgets} 
            timeframe="yearly" 
            onDelete={handleDelete} 
            onTransactionAdded={fetchBudgets}
          />
        </div>
      )}
    </div>
  );
}
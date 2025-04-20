import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, X } from 'lucide-react';
import { Category } from '../types/category';
import { CategorySection } from '../components/budget/CategorySection';
import { AddBudgetForm } from '../components/budget/AddBudgetForm';

export function Budgets() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    timeframe: 'monthly' as 'weekly' | 'monthly' | 'yearly',
  });

  useEffect(() => {
    fetchCategories();
    // Refresh data every minute to keep progress bars updated
    const interval = setInterval(fetchCategories, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchCategories() {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (categoriesError) throw categoriesError;

      const categoriesWithSpending = await Promise.all(
        (categoriesData || []).map(async (category) => {
          const { data: transactionsData, error: transactionsError } = await supabase
            .from('transactions')
            .select('amount')
            .eq('category_id', category.id);

          if (transactionsError) throw transactionsError;

          const totalSpent = (transactionsData || []).reduce(
            (sum, transaction) => sum + Number(transaction.amount),
            0
          );

          return {
            ...category,
            total_spent: totalSpent,
          };
        })
      );

      setCategories(categoriesWithSpending);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { error } = await supabase.from('categories').insert({
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
      fetchCategories();
    } catch (error) {
      console.error('Error adding budget:', error);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchCategories();
    } catch (error) {
      console.error('Error deleting budget:', error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Categories</h1>
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
          Loading categories...
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          No categories found
        </div>
      ) : (
        <div className="space-y-6">
          <CategorySection 
            categories={categories} 
            timeframe="weekly" 
            onDelete={handleDelete} 
            onTransactionAdded={fetchCategories}
          />
          <CategorySection 
            categories={categories} 
            timeframe="monthly" 
            onDelete={handleDelete} 
            onTransactionAdded={fetchCategories}
          />
          <CategorySection 
            categories={categories} 
            timeframe="yearly" 
            onDelete={handleDelete} 
            onTransactionAdded={fetchCategories}
          />
        </div>
      )}
    </div>
  );
}
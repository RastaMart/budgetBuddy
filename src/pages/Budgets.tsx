import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, X } from 'lucide-react';
import { Budget, Category } from '../types/budget';
import { CategorySection } from '../components/budget/CategorySection';
import { AddCategoryForm } from '../components/budget/AddCategoryForm';

export function Budgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showNewBudgetForm, setShowNewBudgetForm] = useState(false);
  const [newBudgetName, setNewBudgetName] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    timeframe: 'monthly' as 'weekly' | 'monthly' | 'yearly',
  });

  useEffect(() => {
    fetchBudgets();
  }, []);

  useEffect(() => {
    if (selectedBudget) {
      fetchCategories();
    }
  }, [selectedBudget]);

  async function fetchBudgets() {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          id,
          name,
          budget_users!inner(user_id)
        `)
        .eq('budget_users.user_id', user.id);

      if (error) throw error;
      setBudgets(data || []);
      
      // Select first budget by default
      if (data && data.length > 0 && !selectedBudget) {
        setSelectedBudget(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching budgets:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchCategories() {
    if (!selectedBudget) return;

    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('budget_id', selectedBudget)
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
    }
  }

  async function handleCreateBudget(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('budgets')
        .insert({ name: newBudgetName })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Add user as owner
        const { error: userError } = await supabase
          .from('budget_users')
          .insert({
            budget_id: data.id,
            user_id: user.id,
            role: 'owner'
          });

        if (userError) throw userError;

        setBudgets([...budgets, data]);
        setSelectedBudget(data.id);
        setNewBudgetName('');
        setShowNewBudgetForm(false);
      }
    } catch (error) {
      console.error('Error creating budget:', error);
    }
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBudget) return;

    try {
      const { error } = await supabase.from('categories').insert({
        budget_id: selectedBudget,
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
      console.error('Error adding category:', error);
    }
  }

  async function handleDeleteCategory(id: string) {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          Loading budgets...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Budget Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <nav className="-mb-px flex space-x-8" aria-label="Budgets">
            {budgets.map((budget) => (
              <button
                key={budget.id}
                onClick={() => setSelectedBudget(budget.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${selectedBudget === budget.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {budget.name}
              </button>
            ))}
          </nav>
          <button
            onClick={() => setShowNewBudgetForm(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="w-4 h-4 mr-1" />
            New Budget
          </button>
        </div>
      </div>

      {/* New Budget Form */}
      {showNewBudgetForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleCreateBudget} className="space-y-4">
            <div>
              <label htmlFor="budgetName" className="block text-sm font-medium text-gray-700">
                Budget Name
              </label>
              <input
                type="text"
                id="budgetName"
                value={newBudgetName}
                onChange={(e) => setNewBudgetName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowNewBudgetForm(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Create Budget
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories Section */}
      {selectedBudget && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Categories</h2>
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
                  Add Category
                </>
              )}
            </button>
          </div>

          {showForm && (
            <AddCategoryForm
              formData={formData}
              onSubmit={handleCreateCategory}
              onChange={(data) => setFormData({ ...formData, ...data })}
            />
          )}

          {categories.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              No categories found
            </div>
          ) : (
            <div className="space-y-6">
              <CategorySection 
                categories={categories} 
                timeframe="weekly" 
                onDelete={handleDeleteCategory} 
                onTransactionAdded={fetchCategories}
              />
              <CategorySection 
                categories={categories} 
                timeframe="monthly" 
                onDelete={handleDeleteCategory} 
                onTransactionAdded={fetchCategories}
              />
              <CategorySection 
                categories={categories} 
                timeframe="yearly" 
                onDelete={handleDeleteCategory} 
                onTransactionAdded={fetchCategories}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
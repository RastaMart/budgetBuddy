import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Category, SharedIncomeAllocation } from '../../types/category';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useContext';

interface BudgetWithCategories {
  id: string;
  name: string;
  categories: Category[];
}

interface FormData {
  name: string;
  amount: string;
  timeframe: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  type: 'spending' | 'income' | 'shared_income';
  amount_type: 'fixed' | 'flexible';
  allocations: SharedIncomeAllocation[];
  allocation_type?: 'manual' | 'dynamic';
}

interface AddCategoryFormProps {
  formData: FormData;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<FormData>) => void;
}

export function AddCategoryForm({ formData, onSubmit, onChange }: AddCategoryFormProps) {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<BudgetWithCategories[]>([]);
  const [newAllocation, setNewAllocation] = useState<SharedIncomeAllocation>({
    name: '',
    percentage: 0,
    isManual: formData.allocation_type === 'manual',
    referenceCategory: undefined
  });

  useEffect(() => {
    if (formData.type === 'shared_income') {
      fetchBudgetsAndCategories();
    }
  }, [formData.type]);

  useEffect(() => {
    // Reset allocations when switching allocation type
    if (formData.type === 'shared_income') {
      onChange({ allocations: [] });
    }
  }, [formData.allocation_type]);

  async function fetchBudgetsAndCategories() {
    try {
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select(`
          id,
          name,
          budget_users!inner (user_id)
        `)
        .eq('budget_users.user_id', user.id);

      if (budgetsError) throw budgetsError;

      const budgetsWithCategories = await Promise.all((budgetsData || []).map(async (budget) => {
        const { data: categories, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .eq('budget_id', budget.id)
          .eq('type', 'income');

        if (categoriesError) throw categoriesError;

        return {
          id: budget.id,
          name: budget.name,
          categories: categories || []
        };
      }));

      setBudgets(budgetsWithCategories);
    } catch (error) {
      console.error('Error fetching budgets and categories:', error);
    }
  }

  const totalPercentage = (formData.allocations || []).reduce((sum, allocation) => 
    sum + allocation.percentage, 0
  );

  const handleAddAllocation = () => {
    const isManual = formData.allocation_type === 'manual';
    if (newAllocation.name && (isManual ? newAllocation.percentage > 0 : newAllocation.referenceCategory)) {
      onChange({
        allocations: [...(formData.allocations || []), { 
          ...newAllocation,
          isManual 
        }]
      });
      setNewAllocation({
        name: '',
        percentage: 0,
        isManual,
        referenceCategory: undefined
      });
    }
  };

  const handleRemoveAllocation = (index: number) => {
    onChange({
      allocations: (formData.allocations || []).filter((_, i) => i !== index)
    });
  };

  const handleReferenceChange = (value: string) => {
    if (!value) {
      setNewAllocation({
        ...newAllocation,
        referenceCategory: undefined,
        name: ''
      });
      return;
    }

    const [budgetId, categoryId] = value.split('|');
    const budget = budgets.find(b => b.id === budgetId);
    const category = budget?.categories.find(c => c.id === categoryId);
    
    if (category && budget) {
      setNewAllocation({
        ...newAllocation,
        referenceCategory: category,
        name: `${budget.name} - ${category.name}`
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Add Category</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Category Name
            </label>
            <input
              type="text"
              id="name"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={formData.name}
              onChange={(e) => onChange({ name: e.target.value })}
              required
            />
          </div>

          <div>
            <label htmlFor="timeframe" className="block text-sm font-medium text-gray-700">
              Timeframe
            </label>
            <select
              id="timeframe"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={formData.timeframe}
              onChange={(e) => onChange({ timeframe: e.target.value as 'weekly' | 'biweekly' | 'monthly' | 'yearly' })}
              required
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category Type
            </label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-indigo-600"
                  name="type"
                  value="spending"
                  checked={formData.type === 'spending'}
                  onChange={(e) => onChange({ 
                    type: e.target.value as 'spending' | 'income' | 'shared_income',
                    allocations: [] 
                  })}
                />
                <span className="ml-2">Spending</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-indigo-600"
                  name="type"
                  value="income"
                  checked={formData.type === 'income'}
                  onChange={(e) => onChange({ 
                    type: e.target.value as 'spending' | 'income' | 'shared_income',
                    allocations: [] 
                  })}
                />
                <span className="ml-2">Income</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-indigo-600"
                  name="type"
                  value="shared_income"
                  checked={formData.type === 'shared_income'}
                  onChange={(e) => onChange({ 
                    type: e.target.value as 'spending' | 'income' | 'shared_income',
                    // amount_type: 'flexible',
                    allocations: [],
                    allocation_type: 'manual'
                  })}
                />
                <span className="ml-2">Shared Income</span>
              </label>
            </div>
          </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount Type
              </label>
              <div className="flex gap-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-indigo-600"
                    name="amount_type"
                    value="fixed"
                    checked={formData.amount_type === 'fixed'}
                    onChange={(e) => onChange({ amount_type: e.target.value as 'fixed' | 'flexible' })}
                  />
                  <span className="ml-2">Fixed</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-indigo-600"
                    name="amount_type"
                    value="flexible"
                    checked={formData.amount_type === 'flexible'}
                    onChange={(e) => onChange({ amount_type: e.target.value as 'fixed' | 'flexible' })}
                  />
                  <span className="ml-2">Flexible</span>
                </label>
              </div>
            </div>
        </div>

        {formData.amount_type === 'fixed' && (
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
              Budget Amount
            </label>
            <input
              type="number"
              id="amount"
              step="0.01"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={formData.amount}
              onChange={(e) => onChange({ amount: e.target.value })}
              required
            />
          </div>
        )}

        {formData.type === 'shared_income' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allocation Type
              </label>
              <div className="flex gap-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-indigo-600"
                    name="allocation_type"
                    value="manual"
                    checked={formData.allocation_type === 'manual'}
                    onChange={(e) => onChange({ 
                      allocation_type: e.target.value as 'manual' | 'dynamic',
                      allocations: []
                    })}
                  />
                  <span className="ml-2">Manual</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-indigo-600"
                    name="allocation_type"
                    value="dynamic"
                    checked={formData.allocation_type === 'dynamic'}
                    onChange={(e) => onChange({ 
                      allocation_type: e.target.value as 'manual' | 'dynamic',
                      allocations: []
                    })}
                  />
                  <span className="ml-2">Dynamic</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">Allocations</h3>
              {formData.allocation_type === 'manual' && (
                <span className={`text-sm ${totalPercentage === 100 ? 'text-green-600' : 'text-red-600'}`}>
                  Total: {totalPercentage}%
                </span>
              )}
            </div>

            {(formData.allocations || []).map((allocation, index) => (
              <div key={index} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{allocation.name}</p>
                  <p className="text-sm text-gray-500">
                    {formData.allocation_type === 'manual' ? `${allocation.percentage}%` : 'Dynamic'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAllocation(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              {formData.allocation_type === 'manual' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Allocation Name
                    </label>
                    <input
                      type="text"
                      value={newAllocation.name}
                      onChange={(e) => setNewAllocation({ ...newAllocation, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Percentage
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={newAllocation.percentage}
                      onChange={(e) => setNewAllocation({ 
                        ...newAllocation, 
                        percentage: parseFloat(e.target.value) || 0 
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Reference Category
                    </label>
                    <select
                      value={newAllocation.referenceCategory ? `${newAllocation.referenceCategory.budget_id}|${newAllocation.referenceCategory.id}` : ''}
                      onChange={(e) => handleReferenceChange(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">Select category</option>
                      {budgets.map(budget => (
                        <optgroup key={budget.id} label={budget.name}>
                          {budget.categories.map(category => (
                            <option key={category.id} value={`${budget.id}|${category.id}`}>
                              {category.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddAllocation}
                disabled={
                  formData.allocation_type === 'manual' 
                    ? (!newAllocation.name || newAllocation.percentage <= 0)
                    : !newAllocation.referenceCategory
                }
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Allocation
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={formData.type === 'shared_income' && formData.allocation_type === 'manual' && totalPercentage !== 100}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </button>
        </div>
      </form>
    </div>
  );
}
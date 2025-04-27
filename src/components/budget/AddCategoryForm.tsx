import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useContext';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

interface FormData {
  name: string;
  amount: string;
  timeframe: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  type: 'spending' | 'income' | 'shared_income';
  amount_type: 'fixed' | 'flexible';
}

interface BudgetAllocation {
  id: string;
  name: string;
  allocation_type: 'manual' | 'dynamic';
  percentage: number;
  reference_category_id?: string;
  calculated_percentage?: number;
  reference_amount?: number;
}

interface AddCategoryFormProps {
  formData: FormData;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<FormData>) => void;
  budgetId: string;
  onSuccess?: () => void;
}

export function AddCategoryForm({
  formData,
  onSubmit,
  onChange,
  budgetId,
  onSuccess,
}: AddCategoryFormProps) {
  const { user } = useAuth();
  const [allocations, setAllocations] = useState<BudgetAllocation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (formData.type === 'shared_income' && budgetId) {
      fetchAllocations();
    }
  }, [formData.type, budgetId]);

  async function fetchAllocations() {
    if (!budgetId) {
      setError('Budget ID is required');
      return;
    }

    try {
      setError(null);
      const { data: allocationsData, error: allocationsError } = await supabase
        .from('budget_allocations')
        .select('*')
        .eq('budget_id', budgetId);

      if (allocationsError) throw allocationsError;

      // For dynamic allocations, calculate percentages based on last month's transactions
      const allocationsWithCalculations = await Promise.all(
        (allocationsData || []).map(async (allocation) => {
          if (allocation.allocation_type === 'dynamic' && allocation.reference_category_id) {
            const lastMonth = subMonths(new Date(), 1);
            const startDate = startOfMonth(lastMonth);
            const endDate = endOfMonth(lastMonth);

            // Get transactions for the reference category
            const { data: transactions } = await supabase
              .from('transactions')
              .select('amount')
              .eq('category_id', allocation.reference_category_id)
              .gte('date', format(startDate, 'yyyy-MM-dd'))
              .lte('date', format(endDate, 'yyyy-MM-dd'));

            const referenceAmount = (transactions || []).reduce(
              (sum, t) => sum + (t.amount || 0),
              0
            );

            return {
              ...allocation,
              reference_amount: referenceAmount,
            };
          }
          return allocation;
        })
      );

      // Calculate percentages for dynamic allocations
      const totalDynamicAmount = allocationsWithCalculations
        .filter((a) => a.allocation_type === 'dynamic')
        .reduce((sum, a) => sum + (a.reference_amount || 0), 0);

      const finalAllocations = allocationsWithCalculations.map((allocation) => {
        if (allocation.allocation_type === 'dynamic' && totalDynamicAmount > 0) {
          const calculatedPercentage = ((allocation.reference_amount || 0) / totalDynamicAmount) * 100;
          return {
            ...allocation,
            calculated_percentage: parseFloat(calculatedPercentage.toFixed(2)),
          };
        }
        return allocation;
      });

      setAllocations(finalAllocations);
    } catch (error) {
      console.error('Error fetching allocations:', error);
      setError('Failed to fetch budget allocations');
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) throw new Error('User not found');
    if (!budgetId) {
      setError('Budget ID is required');
      return;
    }

    try {
      setError(null);
      if (formData.type === 'shared_income') {
        // Create a category for each allocation
        const categoryPromises = allocations.map(allocation => {
          const percentage = allocation.allocation_type === 'manual' 
            ? allocation.percentage 
            : allocation.calculated_percentage || 0;
            
          return supabase.from('categories').insert({
            budget_id: budgetId,
            user_id: user.id,
            name: `${formData.name} - ${allocation.name}`,
            amount: parseFloat(formData.amount) * (percentage / 100),
            timeframe: formData.timeframe,
            type: formData.type,
            amount_type: formData.amount_type,
            shared_amount: parseFloat(formData.amount),
            allocation_id: allocation.id
          });
        });

        await Promise.all(categoryPromises);
      } else {
        // Create a single category for non-shared types
        await supabase.from('categories').insert({
          budget_id: budgetId,
          user_id: user.id,
          name: formData.name,
          amount: parseFloat(formData.amount),
          timeframe: formData.timeframe,
          type: formData.type,
          amount_type: formData.amount_type
        });
      }

      // Reset form
      onChange({
        name: '',
        amount: '',
        timeframe: 'monthly',
        type: 'spending',
        amount_type: 'fixed'
      });

      // Notify parent of success
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating category:', error);
      setError('Failed to create category');
    }
  };

  if (!budgetId) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-md">
        Budget ID is required to add categories
      </div>
    );
  }

  const totalManualPercentage = allocations
    .filter((a) => a.allocation_type === 'manual')
    .reduce((sum, allocation) => sum + (allocation.percentage || 0), 0);

  const totalDynamicPercentage = allocations
    .filter((a) => a.allocation_type === 'dynamic')
    .reduce((sum, allocation) => sum + (allocation.calculated_percentage || 0), 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
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

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category Type
          </label>
          <div className="space-y-2">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-indigo-600"
                name="type"
                value="spending"
                checked={formData.type === 'spending'}
                onChange={(e) =>
                  onChange({
                    type: e.target.value as 'spending' | 'income' | 'shared_income',
                  })
                }
              />
              <span className="ml-2">Spending</span>
            </label>
            <br />
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-indigo-600"
                name="type"
                value="income"
                checked={formData.type === 'income'}
                onChange={(e) =>
                  onChange({
                    type: e.target.value as 'spending' | 'income' | 'shared_income',
                  })
                }
              />
              <span className="ml-2">Income</span>
            </label>
            <br />
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-indigo-600"
                name="type"
                value="shared_income"
                checked={formData.type === 'shared_income'}
                onChange={(e) =>
                  onChange({
                    type: e.target.value as 'spending' | 'income' | 'shared_income',
                  })
                }
              />
              <span className="ml-2">Shared Income</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount Type
          </label>
          <div className="space-y-2">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-indigo-600"
                name="amount_type"
                value="fixed"
                checked={formData.amount_type === 'fixed'}
                onChange={(e) =>
                  onChange({
                    amount_type: e.target.value as 'fixed' | 'flexible',
                  })
                }
              />
              <span className="ml-2">Fixed</span>
            </label>
            <br />
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-indigo-600"
                name="amount_type"
                value="flexible"
                checked={formData.amount_type === 'flexible'}
                onChange={(e) =>
                  onChange({
                    amount_type: e.target.value as 'fixed' | 'flexible',
                  })
                }
              />
              <span className="ml-2">Flexible</span>
            </label>
          </div>
        </div>
      </div>

      <div>
        <label
          htmlFor="timeframe"
          className="block text-sm font-medium text-gray-700"
        >
          Timeframe
        </label>
        <select
          id="timeframe"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          value={formData.timeframe}
          onChange={(e) =>
            onChange({
              timeframe: e.target.value as 'weekly' | 'monthly' | 'yearly',
            })
          }
          required
        >
          <option value="weekly">Weekly</option>
          <option value="biweekly">Biweekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-gray-700"
        >
          Amount
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

      {formData.type === 'shared_income' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-700">
              Budget Allocations
            </h3>
            <div className="text-sm text-gray-500">
              <div>Manual Total: {totalManualPercentage.toFixed(1)}%</div>
              <div>Dynamic Total: {totalDynamicPercentage.toFixed(1)}%</div>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            {allocations.map((allocation) => (
              <div key={allocation.id} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{allocation.name}</p>
                  <p className="text-sm text-gray-500">
                    {allocation.allocation_type === 'manual'
                      ? `${allocation.percentage}%`
                      : `Dynamic: ${allocation.calculated_percentage?.toFixed(1)}%`}
                    {allocation.reference_amount !== undefined && allocation.allocation_type === 'dynamic' && (
                      <span className="ml-2">
                        (${allocation.reference_amount.toFixed(2)})
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-sm text-gray-700">
                  ${((parseFloat(formData.amount) || 0) * ((allocation.allocation_type === 'manual' ? allocation.percentage : (allocation.calculated_percentage || 0)) / 100)).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </button>
      </div>
    </form>
  );
}
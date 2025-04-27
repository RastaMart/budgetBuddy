import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useContext';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfYear,
  endOfYear,
  subYears,
} from 'date-fns';
import { SharedIncomeAllocation } from '../../types/category';
import { Budget } from '../../types/budget';
import { formatAllocation } from '../../utils/formatAllocation';

interface FormData {
  name: string;
  amount: string;
  timeframe: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  type: 'spending' | 'income' | 'shared_income';
  amount_type: 'fixed' | 'flexible';
  allocations: SharedIncomeAllocation[];
  allocation_type: 'manual' | 'dynamic';
}

// interface Budget {
//   id: string;
//   name: string;
//   categories: Category[];
// }

// interface Category {
//   id: string;
//   name: string;
//   type: 'spending' | 'income' | 'shared_income';
// }

interface AddCategoryFormProps {
  formData: FormData;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<FormData>) => void;
}

export function AddCategoryForm({
  formData,
  onSubmit,
  onChange,
}: AddCategoryFormProps) {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [newAllocation, setNewAllocation] = useState<SharedIncomeAllocation>({
    name: '',
    percentage: 0,
    isManual: formData.allocation_type === 'manual',
    referenceCategory: undefined,
    transactionTotal: 0,
  });

  useEffect(() => {
    if (formData.type === 'shared_income') {
      fetchBudgetsAndCategories();
    }
  }, [formData.type, formData.timeframe]);

  useEffect(() => {
    if (formData.type === 'shared_income') {
      onChange({ allocations: [] });
    }
  }, [formData.allocation_type]);

  const getTimeframeDates = () => {
    const now = new Date();
    switch (formData.timeframe) {
      case 'weekly':
        return {
          start: startOfWeek(subWeeks(now, 1)),
          end: endOfWeek(subWeeks(now, 1)),
        };
      case 'biweekly':
        return {
          start: startOfWeek(subWeeks(now, 2)),
          end: endOfWeek(subWeeks(now, 1)),
        };
      case 'monthly':
        return {
          start: startOfMonth(subMonths(now, 1)),
          end: endOfMonth(subMonths(now, 1)),
        };
      case 'yearly':
        return {
          start: startOfYear(subYears(now, 1)),
          end: endOfYear(subYears(now, 1)),
        };
    }
  };

  async function fetchBudgetsAndCategories() {
    if (!user) throw new Error('User not found');
    try {
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select(
          `
          id,
          name,
          budget_users!inner (user_id)
        `
        )
        .eq('budget_users.user_id', user.id);

      if (budgetsError) throw budgetsError;

      const budgetsWithCategories = await Promise.all(
        (budgetsData || []).map(async (budget) => {
          const { data: categories, error: categoriesError } = await supabase
            .from('categories')
            .select('*')
            .eq('budget_id', budget.id)
            .eq('type', 'income');

          if (categoriesError) throw categoriesError;

          const categoriesWithTotals = await Promise.all(
            (categories || []).map(async (category) => {
              const { start, end } = getTimeframeDates();

              const { data: transactions } = await supabase
                .from('transactions')
                .select('amount')
                .eq('category_id', category.id)
                .gte('date', start.toISOString())
                .lte('date', end.toISOString());

              const total = (transactions || []).reduce(
                (sum, t) => sum + (t.amount || 0),
                0
              );

              return {
                ...category,
                transactionTotal: total,
              };
            })
          );

          return {
            id: budget.id,
            name: budget.name,
            categories: categoriesWithTotals,
          };
        })
      );

      setBudgets(budgetsWithCategories);
    } catch (error) {
      console.error('Error fetching budgets and categories:', error);
    }
  }

  const totalPercentage = (formData.allocations || []).reduce(
    (sum, allocation) => sum + allocation.percentage,
    0
  );

  const handleAddAllocation = async () => {
    const isManual = formData.allocation_type === 'manual';
    if (
      newAllocation.name &&
      (isManual
        ? newAllocation.percentage > 0
        : newAllocation.referenceCategory)
    ) {
      if (!isManual && newAllocation.referenceCategory) {
        const { start, end } = getTimeframeDates();

        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount')
          .eq('category_id', newAllocation.referenceCategory.id)
          .gte('date', start.toISOString())
          .lte('date', end.toISOString());

        const total = (transactions || []).reduce(
          (sum, t) => sum + (t.amount || 0),
          0
        );
        newAllocation.transactionTotal = total;
      }

      onChange({
        allocations: [...(formData.allocations || []), newAllocation],
      });

      setNewAllocation({
        name: '',
        percentage: 0,
        isManual,
        referenceCategory: undefined,
        transactionTotal: 0,
      });
    }
  };

  const handleRemoveAllocation = (index: number) => {
    onChange({
      allocations: (formData.allocations || []).filter((_, i) => i !== index),
    });
  };

  const handleReferenceChange = async (value: string) => {
    if (!value) {
      setNewAllocation({
        ...newAllocation,
        referenceCategory: undefined,
        name: '',
        transactionTotal: 0,
      });
      return;
    }

    const [budgetId, categoryId] = value.split('|');
    const budget = budgets.find((b) => b.id === budgetId);
    const category = budget?.categories?.find((c) => c.id === categoryId);

    if (category && budget) {
      const { start, end } = getTimeframeDates();

      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('category_id', category.id)
        .gte('date', start.toISOString())
        .lte('date', end.toISOString());

      const total = (transactions || []).reduce(
        (sum, t) => sum + (t.amount || 0),
        0
      );

      setNewAllocation({
        ...newAllocation,
        referenceCategory: {
          id: category.id,
          budget_id: budget.id,
        },
        name: `${budget.name} - ${category.name}`,
        transactionTotal: total,
      });
    }
  };

  const totalTransactions = formData.allocations.reduce(
    (sum, allocation) => sum + (allocation.transactionTotal || 0),
    0
  );

  const getTimeframeDescription = () => {
    const { start, end } = getTimeframeDates();
    return `* Calculations based on transactions from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
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
                    type: e.target.value as
                      | 'spending'
                      | 'income'
                      | 'shared_income',
                    allocations: [],
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
                    type: e.target.value as
                      | 'spending'
                      | 'income'
                      | 'shared_income',
                    allocations: [],
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
                    type: e.target.value as
                      | 'spending'
                      | 'income'
                      | 'shared_income',
                    allocations: [],
                    allocation_type: 'manual',
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

      {formData.amount_type === 'fixed' && (
        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-gray-700"
          >
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
                  onChange={(e) =>
                    onChange({
                      allocation_type: e.target.value as 'manual' | 'dynamic',
                      allocations: [],
                    })
                  }
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
                  onChange={(e) =>
                    onChange({
                      allocation_type: e.target.value as 'manual' | 'dynamic',
                      allocations: [],
                    })
                  }
                />
                <span className="ml-2">Dynamic</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Allocations</h3>
            <div className="text-right">
              {formData.allocation_type === 'manual' && (
                <span
                  className={`text-sm ${totalPercentage === 100 ? 'text-green-600' : 'text-red-600'}`}
                >
                  Total: {totalPercentage}%
                </span>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {getTimeframeDescription()}
              </p>
            </div>
          </div>

          {(formData.allocations || []).map((allocation, index) => {
            const percentage =
              formData.allocation_type === 'manual'
                ? allocation.percentage.toFixed(1)
                : (
                    ((allocation.transactionTotal || 0) / totalTransactions) *
                    100
                  ).toFixed(1);
            return (
              <div
                key={index}
                className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      {allocation.name}
                      {allocation.transactionTotal !== undefined && (
                        <span className="text-sm text-gray-500">
                          {' '}
                          {' ($'}
                          {allocation.transactionTotal.toFixed(2)}
                          {')'}
                        </span>
                      )}
                    </p>
                    <div className="text-right">
                      {allocation.transactionTotal !== undefined && (
                        <>
                          {}
                          <p className="text-sm text-gray-600">
                            {totalTransactions > 0 && (
                              <span className="ml-2 text-gray-500">
                                ({percentage}
                                %)
                              </span>
                            )}
                          </p>
                        </>
                      )}
                      {formData.amount && parseFloat(formData.amount) > 0 && (
                        <p className="text-lg text-gray-500"></p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    {formatAllocation(percentage, formData.amount)}
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
            );
          })}

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
                    onChange={(e) =>
                      setNewAllocation({
                        ...newAllocation,
                        name: e.target.value,
                      })
                    }
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
                    onChange={(e) =>
                      setNewAllocation({
                        ...newAllocation,
                        percentage: parseFloat(e.target.value) || 0,
                      })
                    }
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
                    value={
                      newAllocation.referenceCategory
                        ? `${newAllocation.referenceCategory.budget_id}|${newAllocation.referenceCategory.id}`
                        : ''
                    }
                    onChange={(e) => handleReferenceChange(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">Select category</option>
                    {budgets.map((budget) => (
                      <optgroup key={budget.id} label={budget.name}>
                        {budget.categories?.map((category) => (
                          <option
                            key={category.id}
                            value={`${budget.id}|${category.id}`}
                          >
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
                  ? !newAllocation.name || newAllocation.percentage <= 0
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
          disabled={
            formData.type === 'shared_income' &&
            formData.allocation_type === 'manual' &&
            totalPercentage !== 100
          }
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </button>
      </div>
    </form>
  );
}

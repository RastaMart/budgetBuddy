import React from 'react';
import { CategoryItem } from './CategoryItem';
import { Category } from '../../types/category';

interface BudgetSectionProps {
  categories: Category[];
  timeframe: string;
  onDelete: (id: string) => void;
  onTransactionAdded: () => void;
}

export function CategorySection({ categories, timeframe, onDelete, onTransactionAdded }: BudgetSectionProps) {
  const filteredCategories = categories.filter(category => category.timeframe === timeframe);
  if (filteredCategories.length === 0) return null;

  // Separate categories by type
  const incomeCategories = filteredCategories.filter(
    cat => cat.type === 'income' || cat.type === 'shared_income'
  );
  const spendingCategories = filteredCategories.filter(
    cat => cat.type === 'spending'
  );

  const timeframeLabels = {
    weekly: 'Weekly Budgets',
    biweekly: 'Bi-Weekly Budgets',
    monthly: 'Monthly Budgets',
    yearly: 'Yearly Budgets'
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="bg-gray-50 px-6 py-3">
        <h2 className="text-lg font-medium text-gray-900">
          {timeframeLabels[timeframe as keyof typeof timeframeLabels]}
        </h2>
      </div>
      <div className="divide-y divide-gray-200">
        {/* Income Categories */}
        {incomeCategories.length > 0 && (
          <div className="bg-green-50">
            <div className="px-6 py-2 bg-green-100">
              <h3 className="text-sm font-medium text-green-800">Income Categories</h3>
            </div>
            <div className="divide-y divide-green-100">
              {incomeCategories.map((category) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  timeframe={timeframe}
                  onDelete={onDelete}
                  onTransactionAdded={onTransactionAdded}
                />
              ))}
            </div>
          </div>
        )}

        {/* Spending Categories */}
        {spendingCategories.length > 0 && (
          <div>
            <div className="px-6 py-2 bg-gray-100">
              <h3 className="text-sm font-medium text-gray-700">Spending Categories</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {spendingCategories.map((category) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  timeframe={timeframe}
                  onDelete={onDelete}
                  onTransactionAdded={onTransactionAdded}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
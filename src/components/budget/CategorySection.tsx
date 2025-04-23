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
        {filteredCategories.map((category) => (
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
  );
}
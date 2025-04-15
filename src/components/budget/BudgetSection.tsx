import React from 'react';
import { BudgetItem } from './BudgetItem';
import { Budget } from '../../types/budget';

interface BudgetSectionProps {
  budgets: Budget[];
  timeframe: string;
  onDelete: (id: string) => void;
  onTransactionAdded: () => void;
}

export function BudgetSection({ budgets, timeframe, onDelete, onTransactionAdded }: BudgetSectionProps) {
  const filteredBudgets = budgets.filter(budget => budget.timeframe === timeframe);
  if (filteredBudgets.length === 0) return null;

  const timeframeLabels = {
    weekly: 'Weekly Budgets',
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
        {filteredBudgets.map((budget) => (
          <BudgetItem
            key={budget.id}
            budget={budget}
            timeframe={timeframe}
            onDelete={onDelete}
            onTransactionAdded={onTransactionAdded}
          />
        ))}
      </div>
    </div>
  );
}
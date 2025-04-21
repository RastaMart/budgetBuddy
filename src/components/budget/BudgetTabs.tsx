import React from "react";
import { Plus, Users } from "lucide-react";
import { Budget } from "../../types/budget";
import { BudgetUser } from "../../services/budgetService";

interface BudgetTabsProps {
  budgets: Budget[];
  selectedBudget: string | null;
  budgetUsers: Record<string, BudgetUser[]>;
  onSelectBudget: (budgetId: string) => void;
  onNewBudget: () => void;
}

export function BudgetTabs({
  budgets,
  selectedBudget,
  budgetUsers,
  onSelectBudget,
  onNewBudget,
}: BudgetTabsProps) {
  return (
    <div className="border-b border-gray-200">
      <div className="flex items-center justify-between">
        <nav className="-mb-px flex space-x-8" aria-label="Budgets">
          {budgets.map((budget) => {
            const isShared = (budgetUsers[budget.id] || []).length > 1;
            return (
              <button
                key={budget.id}
                onClick={() => onSelectBudget(budget.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                  ${
                    selectedBudget === budget.id
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                {budget.name}
                {isShared && <Users className="w-4 h-4 text-gray-400" />}
              </button>
            );
          })}
        </nav>
        <button
          onClick={onNewBudget}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="w-4 h-4 mr-1" />
          New Budget
        </button>
      </div>
    </div>
  );
}

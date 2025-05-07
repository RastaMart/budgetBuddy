import React from 'react';
import { Search, X } from 'lucide-react';
import { Account } from '../../types/account';

interface TransactionFiltersProps {
  accountFilter: string;
  setAccountFilter: (value: string) => void;
  descriptionFilter: string;
  setDescriptionFilter: (value: string) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  periodFilter: string;
  setPeriodFilter: (value: string) => void;
  yearFilter: string;
  setYearFilter: (value: string) => void;
  monthFilter: string;
  setMonthFilter: (value: string) => void;
  accounts: Account[];
  budgets: any[];
  allTransactions: any[];
  clearFilters: () => void;
  showClearFilters: boolean;
}

export function TransactionFilters({
  accountFilter,
  setAccountFilter,
  descriptionFilter,
  setDescriptionFilter,
  categoryFilter,
  setCategoryFilter,
  periodFilter,
  setPeriodFilter,
  yearFilter,
  setYearFilter,
  monthFilter,
  setMonthFilter,
  accounts,
  budgets,
  allTransactions,
  clearFilters,
  showClearFilters,
}: TransactionFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Account Filter */}
          <div>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">All Accounts</option>
              <optgroup label="Bank Accounts">
                {accounts
                  .filter((a) => a.type === 'bank')
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Credit Cards">
                {accounts
                  .filter((a) => a.type === 'credit')
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {/* Period Filter */}
          <div>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">All Time</option>
              <option value="recent">Recent (31 days)</option>
              <option value="current-month">Current Month</option>
              <option value="last-month">Last Month</option>
              <option value="last-3-months">Last 3 Months</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {periodFilter === 'custom' && (
            <>
              <div>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  {Array.from(
                    new Set(
                      allTransactions.map((t) =>
                        new Date(t.assigned_date).getFullYear().toString()
                      )
                    )
                  )
                    .sort((a, b) => Number(b) - Number(a))
                    .map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  {Array.from(
                    new Set(
                      allTransactions.map((t) =>
                        new Date(t.assigned_date).toLocaleString('default', {
                          month: 'long',
                        })
                      )
                    )
                  ).map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Description Filter */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search description..."
            value={descriptionFilter}
            onChange={(e) => setDescriptionFilter(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="all">All Categories</option>
            <option value="unassigned">Unassigned</option>
            {budgets.map((budget) => (
              <optgroup key={budget.id} label={budget.name}>
                {budget.categories.map((category: any) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Clear Filters */}
        {showClearFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <X className="w-4 h-4" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { TransactionItem } from './TransactionItem';
import { EmptyState } from '../shared/EmptyState';
import { DeleteTransactionModal } from './DeleteTransactionModal';
import { BulkActionsModal } from './BulkActionsModal';
import { BulkDeleteModal } from './BulkDeleteModal';
import { BudgetCategoryModal } from './BudgetCategoryModal';
import { Account } from '../../types/account';
import { supabase } from '../../lib/supabase';
import { Calendar, Search } from 'lucide-react';

interface TransactionListProps {
  transactions: Record<string, Record<string, any[]>>;
  accounts: Account[];
  onDelete: (id: string) => void;
  onTransactionUpdate: () => void;
  onAddTransaction: () => void;
  filters: {
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
    budgets: any[];
    clearFilters: () => void;
    showClearFilters: boolean;
  };
}

export function TransactionList({
  transactions,
  accounts,
  onDelete,
  onTransactionUpdate,
  onAddTransaction,
  filters,
}: TransactionListProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<{
    id: string;
    description: string;
    amount: number;
  } | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<any[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showBulkCategory, setShowBulkCategory] = useState(false);

  const handleDelete = (transaction: { id: string; description: string; amount: number }) => {
    setSelectedTransaction(transaction);
  };

  const handleConfirmDelete = () => {
    if (selectedTransaction) {
      onDelete(selectedTransaction.id);
      setSelectedTransaction(null);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .in('id', selectedTransactions.map(t => t.id));

      if (error) throw error;
      onTransactionUpdate();
      setSelectedTransactions([]);
      setShowBulkDelete(false);
    } catch (error) {
      console.error('Error deleting transactions:', error);
    }
  };

  const handleBulkUpdateAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ account_id: accountId })
        .in('id', selectedTransactions.map(t => t.id));

      if (error) throw error;
      onTransactionUpdate();
      setShowBulkActions(false);
    } catch (error) {
      console.error('Error updating transactions:', error);
    }
  };

  const handleBulkUpdateDate = async (date: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ assigned_date: date })
        .in('id', selectedTransactions.map(t => t.id));

      if (error) throw error;
      onTransactionUpdate();
      setShowBulkActions(false);
    } catch (error) {
      console.error('Error updating transactions:', error);
    }
  };

  const handleBulkCategoryUpdate = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ category_id: categoryId })
        .in('id', selectedTransactions.map(t => t.id));

      if (error) throw error;
      onTransactionUpdate();
      setShowBulkCategory(false);
      setSelectedTransactions([]);
    } catch (error) {
      console.error('Error updating transactions:', error);
    }
  };

  const toggleTransactionSelection = (transaction: any) => {
    setSelectedTransactions(current => {
      const isSelected = current.some(t => t.id === transaction.id);
      if (isSelected) {
        return current.filter(t => t.id !== transaction.id);
      }
      return [...current, transaction];
    });
  };

  const toggleAllTransactions = (checked: boolean, transactions: any[]) => {
    if (checked) {
      setSelectedTransactions(transactions);
    } else {
      setSelectedTransactions([]);
    }
  };

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-6 py-2 flex items-center gap-4">
        <div className="w-6"></div>
        <div className="flex items-center gap-4 w-[400px]">
          <div className="w-[200px]">
            <select
              value={filters.accountFilter}
              onChange={(e) => filters.setAccountFilter(e.target.value)}
              className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
          <div className="w-[200px]">
            <select
              value={filters.periodFilter}
              onChange={(e) => filters.setPeriodFilter(e.target.value)}
              className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">All Time</option>
              <option value="recent">Recent (31 days)</option>
              <option value="current-month">Current Month</option>
              <option value="last-month">Last Month</option>
              <option value="last-3-months">Last 3 Months</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        <div className="flex-1 px-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search description..."
              value={filters.descriptionFilter}
              onChange={(e) => filters.setDescriptionFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <Search className="absolute left-3 top-2 h-4 w-4 text-gray-400" />
          </div>
        </div>

        <div className="w-[200px]">
          <select
            value={filters.categoryFilter}
            onChange={(e) => filters.setCategoryFilter(e.target.value)}
            className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="all">All Categories</option>
            <option value="unassigned">Unassigned</option>
            {filters.budgets.map((budget) => (
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

        <div className="w-[200px] flex justify-end">
          {filters.showClearFilters && (
            <button
              onClick={filters.clearFilters}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {Object.keys(transactions).length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="No transactions found"
            description="Add your first transaction to get started"
            action={{
              label: 'Add Transaction',
              onClick: onAddTransaction,
            }}
          />
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {Object.entries(transactions)
            .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
            .map(([year, months]) => (
              <div key={year} className="bg-white">
                <div className="divide-y divide-gray-100">
                  {Object.entries(months)
                    .sort(([monthA], [monthB]) => {
                      const dateA = new Date(`${monthA} 1, ${year}`);
                      const dateB = new Date(`${monthB} 1, ${year}`);
                      return dateB.getTime() - dateA.getTime();
                    })
                    .map(([month, monthTransactions]) => (
                      <div key={`${year}-${month}`} className="bg-gray-50">
                        <div className="px-6 py-2 bg-gray-100 flex items-center gap-4">
                          <input
                            type="checkbox"
                            checked={monthTransactions.every(t => 
                              selectedTransactions.some(st => st.id === t.id)
                            )}
                            onChange={(e) => toggleAllTransactions(e.target.checked, monthTransactions)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <h3 className="text-sm font-medium text-gray-700">
                              {month} {year}
                            </h3>
                          </div>
                        </div>
                        <div className="divide-y divide-gray-200 px-6">
                          {monthTransactions.map((transaction) => (
                            <TransactionItem
                              key={transaction.id}
                              transaction={transaction}
                              isSelected={selectedTransactions.some(t => t.id === transaction.id)}
                              onSelect={() => toggleTransactionSelection(transaction)}
                              onDelete={() => handleDelete(transaction)}
                              onAssignedDateChange={onTransactionUpdate}
                              onEdit={onTransactionUpdate}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {selectedTransactions.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {selectedTransactions.length} transactions selected
              </span>
              <button
                onClick={() => setSelectedTransactions([])}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Unselect all
              </button>
            </div>
            <div className="space-x-4">
              <button
                onClick={() => setShowBulkActions(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Bulk Actions
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTransaction && (
        <DeleteTransactionModal
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onConfirm={handleConfirmDelete}
          description={selectedTransaction.description}
          amount={selectedTransaction.amount}
        />
      )}

      <BulkActionsModal
        isOpen={showBulkActions}
        onClose={() => setShowBulkActions(false)}
        selectedTransactions={selectedTransactions}
        accounts={accounts}
        onUpdateAccount={handleBulkUpdateAccount}
        onUpdateDate={handleBulkUpdateDate}
        onDelete={() => {
          setShowBulkActions(false);
          setShowBulkDelete(true);
        }}
        onCategorize={() => {
          setShowBulkActions(false);
          setShowBulkCategory(true);
        }}
      />

      <BulkDeleteModal
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={handleBulkDelete}
        count={selectedTransactions.length}
      />

      {showBulkCategory && (
        <BudgetCategoryModal
          isOpen={showBulkCategory}
          onClose={() => setShowBulkCategory(false)}
          description={selectedTransactions[0]?.description || ''}
          onSelect={handleBulkCategoryUpdate}
          account_id={selectedTransactions[0]?.account_id}
          skipConfirmation={true}
        />
      )}
    </>
  );
}
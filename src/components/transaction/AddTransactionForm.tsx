import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { CSVImport } from './CSVImport';
import { Transaction } from '../../types/transaction';
import { Category } from '../../types/category';
import { Account } from '../../types/account';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useContext';

interface FormData {
  category_id?: string;
  account_id: string;
  allocation_id?: string;
  amount: string;
  description: string;
  date: string;
  transactionType: 'spending' | 'deposit';
}

interface AddTransactionFormProps {
  formData: FormData;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<FormData>) => void;
  categories?: Category[];
  selectedCategoryId?: string;
  onBulkImport?: (transactions: Transaction[]) => void;
  onClose?: () => void;
  isEditing?: boolean;
}

export function AddTransactionForm({
  formData,
  onSubmit,
  onChange,
  categories,
  selectedCategoryId,
  onBulkImport,
  onClose,
  isEditing = false,
}: AddTransactionFormProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'manual' | 'bulk'>('manual');
  const [groupedCategories, setGroupedCategories] = useState<{
    [key: string]: Category[];
  }>({});
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    if (categories) {
      const grouped = categories.reduce(
        (acc: { [key: string]: Category[] }, category) => {
          const budgetName = category.budget?.name || 'Uncategorized';
          if (!acc[budgetName]) {
            acc[budgetName] = [];
          }
          acc[budgetName].push(category);
          return acc;
        },
        {}
      );
      setGroupedCategories(grouped);
    }

    fetchAccounts();
  }, [categories]);

  useEffect(() => {
    if (formData.account_id && formData.description) {
      checkTransactionRule();
    }
  }, [formData.account_id, formData.description]);

  async function fetchAccounts() {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  }

  async function checkTransactionRule() {
    try {
      const { data: rule, error } = await supabase
        .from('transaction_rules')
        .select('category_id')
        .eq('user_id', user?.id)
        .eq('account_id', formData.account_id)
        .eq('description', formData.description)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          // Not Found error
          console.error('Error checking transaction rule:', error);
        }
        return;
      }

      if (rule) {
        onChange({ category_id: rule.category_id });
      }
    } catch (error) {
      console.error('Error checking transaction rule:', error);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Convert amount based on transaction type
    const amount = parseFloat(formData.amount);
    const adjustedAmount =
      formData.transactionType === 'spending'
        ? -Math.abs(amount)
        : Math.abs(amount);
    onChange({ amount: adjustedAmount.toString() });
    onSubmit(e);
  };

  const handleBulkImport = async (transactions: Transaction[]) => {
    // Check rules for each transaction
    console.log('handleBulkImport', transactions);
    const processedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        const { data: t, error } = await supabase
          .from('transactions')
          .select('category_id')
          .eq('id', transaction.id)
          .single();
        if (error) throw error;
        console.log('t', t);
        return {
          ...transaction,
          category_id: t?.category_id || null,
        };
      })
    );

    if (onBulkImport) {
      onBulkImport(processedTransactions);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div>
      {!isEditing && (
        <div className="flex border-b border-gray-200 mb-4">
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'manual'
                ? 'border-b-2 border-indigo-500 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('manual')}
          >
            Manual Import
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'bulk'
                ? 'border-b-2 border-indigo-500 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('bulk')}
          >
            Bulk Import
          </button>
        </div>
      )}

      {activeTab === 'manual' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Transaction Type
              </label>
              <div className="mt-1 space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="spending"
                    checked={formData.transactionType === 'spending'}
                    onChange={(e) =>
                      onChange({
                        transactionType: e.target.value as
                          | 'spending'
                          | 'deposit',
                      })
                    }
                    className="form-radio text-indigo-600"
                  />
                  <span className="ml-2">Spending</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="deposit"
                    checked={formData.transactionType === 'deposit'}
                    onChange={(e) =>
                      onChange({
                        transactionType: e.target.value as
                          | 'spending'
                          | 'deposit',
                      })
                    }
                    className="form-radio text-indigo-600"
                  />
                  <span className="ml-2">Deposit</span>
                </label>
              </div>
            </div>

            <div>
              <label
                htmlFor="account"
                className="block text-sm font-medium text-gray-700"
              >
                Account
              </label>
              <select
                id="account"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.account_id}
                onChange={(e) => onChange({ account_id: e.target.value })}
                required
              >
                <option value="">Select an account</option>
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

            {!selectedCategoryId && categories && (
              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-gray-700"
                >
                  Category
                </label>
                <select
                  id="category"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.category_id}
                  onChange={(e) => onChange({ category_id: e.target.value })}
                >
                  <option value="">Select a category</option>
                  {Object.entries(groupedCategories).map(
                    ([budgetName, cats]) => (
                      <optgroup key={budgetName} label={budgetName}>
                        {cats.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </optgroup>
                    )
                  )}
                </select>
              </div>
            )}

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

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                Description
              </label>
              <input
                type="text"
                id="description"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.description}
                onChange={(e) => onChange({ description: e.target.value })}
                required
              />
            </div>

            <div>
              <label
                htmlFor="date"
                className="block text-sm font-medium text-gray-700"
              >
                Date
              </label>
              <input
                type="date"
                id="date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.date}
                onChange={(e) => onChange({ date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              {isEditing ? 'Update' : 'Add'} Transaction
            </button>
          </div>
        </form>
      )}

      {activeTab === 'bulk' && !isEditing && (
        <div className="space-y-6">
          <CSVImport
            onTransactionsLoaded={handleBulkImport}
            accounts={accounts}
            onClose={onClose}
          />
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useContext';
import { Plus, Search, X } from 'lucide-react';
import { TransactionItem } from '../components/transaction/TransactionItem';
import { Modal } from '../components/shared/Modal';
import { AddTransactionForm } from '../components/transaction/AddTransactionForm';
import { Card } from '../components/shared/Card';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { EmptyState } from '../components/shared/EmptyState';
import { useSearchParams } from 'react-router-dom';
import {
  format,
  parseISO,
  subMonths,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  subDays,
  endOfDay,
} from 'date-fns';

interface Transaction {
  id: string;
  category_id: string | null;
  amount: number;
  description: string;
  date: string;
  assigned_date: string;
  type: 'account' | 'virtual' | 'income_distribution';
  account_id: string | null;
  category?: {
    name: string;
    budget?: {
      name: string;
    };
  } | null;
  account?: {
    name: string;
    icon: string;
  } | null;
}

interface GroupedTransactions {
  [year: string]: {
    [month: string]: Transaction[];
  };
}

interface Budget {
  id: string;
  name: string;
  categories: {
    id: string;
    name: string;
  }[];
}

export function Transactions() {
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<GroupedTransactions>({});
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  // Filters
  const [accountFilter, setAccountFilter] = useState(
    searchParams.get('account') || 'all'
  );
  const [descriptionFilter, setDescriptionFilter] = useState(
    searchParams.get('description') || ''
  );
  const [categoryFilter, setCategoryFilter] = useState(
    searchParams.get('category') || 'all'
  );
  const [periodFilter, setPeriodFilter] = useState(
    searchParams.get('period') || 'recent'
  );
  const [yearFilter, setYearFilter] = useState(
    searchParams.get('year') || new Date().getFullYear().toString()
  );
  const [monthFilter, setMonthFilter] = useState(
    searchParams.get('month') || format(new Date(), 'MMMM')
  );

  const [formData, setFormData] = useState({
    category_id: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    transactionType: 'spending' as 'spending' | 'deposit',
  });

  useEffect(() => {
    fetchTransactions();
    fetchBudgets();
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (allTransactions.length > 0) {
      applyFilters();
    }
  }, [
    accountFilter,
    descriptionFilter,
    categoryFilter,
    periodFilter,
    yearFilter,
    monthFilter,
  ]);

  useEffect(() => {
    // Update URL with filters
    const params = new URLSearchParams();
    if (accountFilter !== 'all') params.set('account', accountFilter);
    if (descriptionFilter) params.set('description', descriptionFilter);
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    if (periodFilter !== 'recent') params.set('period', periodFilter);
    if (periodFilter === 'custom') {
      params.set('year', yearFilter);
      params.set('month', monthFilter);
    }
    setSearchParams(params);
  }, [
    accountFilter,
    descriptionFilter,
    categoryFilter,
    periodFilter,
    yearFilter,
    monthFilter,
  ]);

  const clearFilters = () => {
    setAccountFilter('all');
    setDescriptionFilter('');
    setCategoryFilter('all');
    setPeriodFilter('recent');
    setYearFilter(new Date().getFullYear().toString());
    setMonthFilter(format(new Date(), 'MMMM'));
  };

  const sortTransactions = (a: Transaction, b: Transaction) => {
    const dateA = parseISO(a.assigned_date);
    const dateB = parseISO(b.assigned_date);
    const dateDiff = dateB.getTime() - dateA.getTime();

    if (dateDiff === 0) {
      return a.description.localeCompare(b.description);
    }
    return dateDiff;
  };

  const applyFilters = () => {
    let filteredTransactions = [...allTransactions];
    const now = new Date();

    // Filter out income_distribution transactions
    filteredTransactions = filteredTransactions.filter(
      (t) => t.type !== 'income_distribution'
    );

    // Apply account filter
    if (accountFilter !== 'all') {
      filteredTransactions = filteredTransactions.filter(
        (t) => t.account_id === accountFilter
      );
    }

    // Apply description filter
    if (descriptionFilter) {
      filteredTransactions = filteredTransactions.filter((t) =>
        t.description.toLowerCase().includes(descriptionFilter.toLowerCase())
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'unassigned') {
        filteredTransactions = filteredTransactions.filter(
          (t) => !t.category_id
        );
      } else {
        filteredTransactions = filteredTransactions.filter(
          (t) => t.category_id === categoryFilter
        );
      }
    }

    // Apply period filter
    switch (periodFilter) {
      case 'recent':
        const thirtyOneDaysAgo = subDays(now, 31);
        filteredTransactions = filteredTransactions.filter((t) => {
          const date = parseISO(t.assigned_date);
          return isWithinInterval(date, {
            start: thirtyOneDaysAgo,
            end: endOfDay(now),
          });
        });
        break;
      case 'current-month':
        filteredTransactions = filteredTransactions.filter((t) => {
          const date = parseISO(t.assigned_date);
          return isWithinInterval(date, {
            start: startOfMonth(now),
            end: endOfMonth(now),
          });
        });
        break;
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        filteredTransactions = filteredTransactions.filter((t) => {
          const date = parseISO(t.assigned_date);
          return isWithinInterval(date, {
            start: startOfMonth(lastMonth),
            end: endOfMonth(lastMonth),
          });
        });
        break;
      case 'last-3-months':
        const threeMonthsAgo = subMonths(now, 3);
        filteredTransactions = filteredTransactions.filter((t) => {
          const date = parseISO(t.assigned_date);
          return isWithinInterval(date, {
            start: startOfMonth(threeMonthsAgo),
            end: endOfMonth(now),
          });
        });
        break;
      case 'custom':
        filteredTransactions = filteredTransactions.filter((t) => {
          const date = parseISO(t.assigned_date);
          return (
            date.getFullYear().toString() === yearFilter &&
            format(date, 'MMMM') === monthFilter
          );
        });
        break;
    }

    filteredTransactions.sort(sortTransactions);
    const groupedData = groupTransactionsByDate(filteredTransactions);
    setTransactions(groupedData);
    const years = Object.keys(groupedData);
    setExpandedGroups(new Set(years));
  };

  const groupTransactionsByDate = (
    transactionList: Transaction[]
  ): GroupedTransactions => {
    return transactionList.reduce(
      (groups: GroupedTransactions, transaction) => {
        const date = parseISO(transaction.assigned_date);
        const year = date.getFullYear().toString();
        const month = format(date, 'MMMM');

        if (!groups[year]) {
          groups[year] = {};
        }
        if (!groups[year][month]) {
          groups[year][month] = [];
        }
        groups[year][month].push(transaction);
        groups[year][month].sort(sortTransactions);

        return groups;
      },
      {}
    );
  };

  async function fetchTransactions() {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(
          `
          id,
          category_id,
          amount,
          description,
          date,
          assigned_date,
          account_id,
          type,
          category:categories(name, budget:budgets(name)),
          account:accounts(name, icon)
        `
        )
        .eq('user_id', user.id)
        .order('assigned_date', { ascending: false })
        .order('description', { ascending: true });

      if (error) throw error;

      const localData =
        data?.map((transaction) => ({
          ...transaction,
        })) || [];

      setAllTransactions(localData);
      const groupedData = groupTransactionsByDate(localData);
      setTransactions(groupedData);
      const years = Object.keys(groupedData);
      setExpandedGroups(new Set(years));
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchBudgets() {
    try {
      const { data, error } = await supabase.from('budgets').select(`
          id,
          name,
          categories (
            id,
            name
          )
        `);

      if (error) throw error;
      setBudgets(data || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    }
  }

  async function fetchAccounts() {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, type')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        category_id: formData.category_id || null,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: formData.date,
        assigned_date: formData.date,
        type: 'account',
      });

      if (error) throw error;

      setFormData({
        category_id: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        transactionType: 'spending',
      });

      setShowTransactionModal(false);
      fetchTransactions();
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Transactions</h1>
        <button
          onClick={() => setShowTransactionModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Transaction
        </button>
      </div>

      <Card>
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
                            parseISO(t.assigned_date).getFullYear().toString()
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
                            format(parseISO(t.assigned_date), 'MMMM')
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
                    {budget.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            {(accountFilter !== 'all' ||
              descriptionFilter ||
              categoryFilter !== 'all' ||
              periodFilter !== 'recent') && (
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
      </Card>

      <Card>
        {Object.keys(transactions).length === 0 ? (
          <EmptyState
            title="No transactions found"
            description="Add your first transaction to get started"
            action={{
              label: 'Add Transaction',
              onClick: () => setShowTransactionModal(true),
            }}
          />
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
                          <div className="px-6 py-2 bg-gray-100">
                            <h3 className="text-sm font-medium text-gray-700">
                              {month} {year}
                            </h3>
                          </div>
                          <div className="divide-y divide-gray-200 px-6">
                            {monthTransactions.map((transaction) => (
                              <TransactionItem
                                key={transaction.id}
                                id={transaction.id}
                                description={transaction.description}
                                amount={transaction.amount}
                                date={transaction.date}
                                assignedDate={transaction.assigned_date}
                                categoryName={transaction.category?.name}
                                account_id={transaction.account_id}
                                accountName={transaction.account?.name}
                                accountIcon={transaction.account?.icon}
                                onDelete={handleDelete}
                                onAssignedDateChange={fetchTransactions}
                                onEdit={fetchTransactions}
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
      </Card>

      <Modal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        title="Add Transaction"
        size="full"
      >
        <AddTransactionForm
          formData={formData}
          onSubmit={handleSubmit}
          onChange={(data) => setFormData({ ...formData, ...data })}
          onClose={() => setShowTransactionModal(false)}
        />
      </Modal>
    </div>
  );
}

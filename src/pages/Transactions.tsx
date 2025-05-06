import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useContext';
import { Plus } from 'lucide-react';
import { TransactionItem } from '../components/transaction/TransactionItem';
import { Modal } from '../components/shared/Modal';
import { AddTransactionForm } from '../components/transaction/AddTransactionForm';
import { Card } from '../components/shared/Card';
import { FilterBar } from '../components/shared/FilterBar';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { EmptyState } from '../components/shared/EmptyState';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
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
import { useFilters } from '../hooks/useFilters';
import { Transaction } from '../types/transaction';
import { Account } from '../types/account';

interface GroupedTransactions {
  [year: string]: {
    [month: string]: Transaction[];
  };
}

type FilterType =
  | 'recent'
  | 'last-month'
  | 'current-month'
  | 'last-3-months'
  | 'custom';

export function Transactions() {
  const { user, profile } = useAuth();
  const [transactions, setTransactions] = useState<GroupedTransactions>({});
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  const { filters, updateFilter } = useFilters([
    { type: 'account', value: 'all' },
    { type: 'period', value: 'recent' },
    { type: 'year', value: new Date().getFullYear().toString() },
    { type: 'month', value: format(new Date(), 'MMMM') },
  ]);

  const [formData, setFormData] = useState({
    category_id: '',
    amount: '',
    description: '',
    date: toZonedTime(new Date(), profile?.timezone || 'UTC'),
    transactionType: 'spending' as 'spending' | 'deposit',
  });

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (allTransactions.length > 0) {
      applyFilters();
    }
  }, [filters, allTransactions]);

  const filterOptions = {
    account: [
      { value: 'all', label: 'All Accounts' },
      ...accounts
        .filter((a) => a.type === 'bank')
        .map((a) => ({ value: a.id, label: a.name })),
      ...accounts
        .filter((a) => a.type === 'credit')
        .map((a) => ({ value: a.id, label: a.name })),
    ],
    period: [
      { value: 'recent', label: 'Recent (31 days)' },
      { value: 'current-month', label: 'Current Month' },
      { value: 'last-month', label: 'Last Month' },
      { value: 'last-3-months', label: 'Last 3 Months' },
      { value: 'custom', label: 'Custom' },
    ],
    year: allTransactions
      .map((t) => parseISO(t.assigned_date).getFullYear().toString())
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort((a, b) => Number(b) - Number(a))
      .map((year) => ({ value: year, label: year })),
    month: Array.from(
      new Set(allTransactions.map((t) => format(parseISO(t.assigned_date), 'MMMM')))
    ).map((month) => ({ value: month, label: month })),
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

    filteredTransactions = filteredTransactions.filter(
      (t) => t.type !== 'income_distribution'
    );

    const accountFilter = filters.find((f) => f.type === 'account')?.value;
    if (accountFilter !== 'all') {
      filteredTransactions = filteredTransactions.filter(
        (t) => t.account_id === accountFilter
      );
    }

    const periodFilter = filters.find((f) => f.type === 'period')?.value as FilterType;
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
        const yearFilter = filters.find((f) => f.type === 'year')?.value;
        const monthFilter = filters.find((f) => f.type === 'month')?.value;
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
          category:categories(name),
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

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', user.id);

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
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
      const utcDate = fromZonedTime(
        new Date(formData.date),
        profile?.timezone || 'UTC'
      );
      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        category_id: formData.category_id || null,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: utcDate,
        assigned_date: utcDate,
        type: 'account',
      });

      if (error) throw error;

      setFormData({
        category_id: '',
        amount: '',
        description: '',
        date: toZonedTime(new Date().toISOString(), profile?.timezone || 'UTC'),
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
        <FilterBar
          filters={[
            {
              id: 'account',
              label: 'Account',
              options: filterOptions.account,
              value: filters.find((f) => f.type === 'account')?.value || 'all',
              onChange: (value) => updateFilter('account', value),
            },
            {
              id: 'period',
              label: 'Period',
              options: filterOptions.period,
              value: filters.find((f) => f.type === 'period')?.value || 'recent',
              onChange: (value) => updateFilter('period', value),
            },
            ...(filters.find((f) => f.type === 'period')?.value === 'custom'
              ? [
                  {
                    id: 'year',
                    label: 'Year',
                    options: filterOptions.year,
                    value:
                      filters.find((f) => f.type === 'year')?.value ||
                      new Date().getFullYear().toString(),
                    onChange: (value) => updateFilter('year', value),
                  },
                  {
                    id: 'month',
                    label: 'Month',
                    options: filterOptions.month,
                    value:
                      filters.find((f) => f.type === 'month')?.value ||
                      format(new Date(), 'MMMM'),
                    onChange: (value) => updateFilter('month', value),
                  },
                ]
              : []),
          ]}
        />
      </Card>

      <Card title="Transaction History">
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
          categories={categories}
          onClose={() => setShowTransactionModal(false)}
        />
      </Modal>
    </div>
  );
}
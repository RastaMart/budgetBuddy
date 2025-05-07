import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useContext';
import { Plus } from 'lucide-react';
import { Modal } from '../components/shared/Modal';
import { AddTransactionForm } from '../components/transaction/AddTransactionForm';
import { Card } from '../components/shared/Card';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { useSearchParams } from 'react-router-dom';
import { TransactionFilters } from '../components/transaction/TransactionFilters';
import { TransactionList } from '../components/transaction/TransactionList';
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
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<GroupedTransactions>({});
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
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
    account_id: '',
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

  const applyFilters = (data = allTransactions) => {
    let filteredTransactions = [...data];
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
    if (periodFilter !== 'all') {
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
    }

    filteredTransactions.sort(sortTransactions);
    const groupedData = groupTransactionsByDate(filteredTransactions);
    setTransactions(groupedData);
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
      applyFilters(localData);
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
      const amount =
        formData.transactionType === 'spending'
          ? -Math.abs(parseFloat(formData.amount))
          : Math.abs(parseFloat(formData.amount));

      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        category_id: formData.category_id || null,
        account_id: formData.account_id,
        amount: amount,
        description: formData.description,
        date: formData.date,
        assigned_date: formData.date,
        type: 'account',
      });

      if (error) throw error;

      setFormData({
        category_id: '',
        account_id: '',
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

  function handleBulkImport(data: Transaction[]) {
    fetchTransactions();
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

  const showClearFilters =
    accountFilter !== 'all' ||
    descriptionFilter ||
    categoryFilter !== 'all' ||
    periodFilter !== 'recent';

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
        <TransactionFilters
          accountFilter={accountFilter}
          setAccountFilter={setAccountFilter}
          descriptionFilter={descriptionFilter}
          setDescriptionFilter={setDescriptionFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          periodFilter={periodFilter}
          setPeriodFilter={setPeriodFilter}
          yearFilter={yearFilter}
          setYearFilter={setYearFilter}
          monthFilter={monthFilter}
          setMonthFilter={setMonthFilter}
          accounts={accounts}
          budgets={budgets}
          allTransactions={allTransactions}
          clearFilters={clearFilters}
          showClearFilters={showClearFilters}
        />
      </Card>

      <Card>
        <TransactionList
          transactions={transactions}
          onDelete={handleDelete}
          onTransactionUpdate={fetchTransactions}
          onAddTransaction={() => setShowTransactionModal(true)}
        />
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
          onBulkImport={handleBulkImport}
          onChange={(data) => setFormData({ ...formData, ...data })}
          onClose={() => setShowTransactionModal(false)}
        />
      </Modal>
    </div>
  );
}

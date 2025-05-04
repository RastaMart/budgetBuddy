import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useContext";
import { Plus, ChevronDown, ChevronRight, Filter } from "lucide-react";
import { TransactionItem } from "../components/transaction/TransactionItem";
import { Modal } from "../components/shared/Modal";
import { AddTransactionForm } from "../components/transaction/AddTransactionForm";
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
} from "date-fns";

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
  } | null;
  account?: {
    name: string;
    icon: string;
  } | null;
}

interface Category {
  id: string;
  name: string;
}

interface Account {
  id: string;
  name: string;
  type: 'bank' | 'credit';
}

interface GroupedTransactions {
  [year: string]: {
    [month: string]: Transaction[];
  };
}

type FilterType = "recent" | "last-month" | "current-month" | "last-3-months" | "custom";

export function Transactions() {
  const { user, profile } = useAuth();
  const [transactions, setTransactions] = useState<GroupedTransactions>({});
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("recent");
  const [customFilter, setCustomFilter] = useState({
    year: new Date().getFullYear().toString(),
    month: format(new Date(), "MMMM"),
  });

  const [formData, setFormData] = useState({
    category_id: "",
    amount: "",
    description: "",
    date: toZonedTime(new Date(), profile?.timezone || 'UTC'),
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
  }, [filterType, customFilter, selectedAccount, allTransactions]);

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
    filteredTransactions = filteredTransactions.filter(t => t.type !== 'income_distribution');

    // Apply account filter
    if (selectedAccount !== 'all') {
      filteredTransactions = filteredTransactions.filter(t => t.account_id === selectedAccount);
    }

    switch (filterType) {
      case "recent":
        const thirtyOneDaysAgo = subDays(now, 31);
        filteredTransactions = filteredTransactions.filter((t) => {
          const date = parseISO(t.assigned_date);
          return isWithinInterval(date, {
            start: thirtyOneDaysAgo,
            end: endOfDay(now),
          });
        });
        break;
      case "current-month":
        filteredTransactions = filteredTransactions.filter((t) => {
          const date = parseISO(t.assigned_date);
          return isWithinInterval(date, {
            start: startOfMonth(now),
            end: endOfMonth(now),
          });
        });
        break;
      case "last-month":
        const lastMonth = subMonths(now, 1);
        filteredTransactions = filteredTransactions.filter((t) => {
          const date = parseISO(t.assigned_date);
          return isWithinInterval(date, {
            start: startOfMonth(lastMonth),
            end: endOfMonth(lastMonth),
          });
        });
        break;
      case "last-3-months":
        const threeMonthsAgo = subMonths(now, 3);
        filteredTransactions = filteredTransactions.filter((t) => {
          const date = parseISO(t.assigned_date);
          return isWithinInterval(date, {
            start: startOfMonth(threeMonthsAgo),
            end: endOfMonth(now),
          });
        });
        break;
      case "custom":
        filteredTransactions = filteredTransactions.filter((t) => {
          const date = parseISO(t.assigned_date);
          return (
            date.getFullYear().toString() === customFilter.year &&
            format(date, "MMMM") === customFilter.month
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
        const month = format(date, "MMMM");

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
        .from("transactions")
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
        .eq("user_id", user.id)
        .order("assigned_date", { ascending: false })
        .order("description", { ascending: true });

      if (error) throw error;

      const localData = data?.map(transaction => ({
        ...transaction,
      })) || [];

      setAllTransactions(localData);
      const groupedData = groupTransactionsByDate(localData);
      setTransactions(groupedData);
      const years = Object.keys(groupedData);
      setExpandedGroups(new Set(years));
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("user_id", user.id);

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }

  async function fetchAccounts() {
    try {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, name, type")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const utcDate = fromZonedTime(new Date(formData.date), profile?.timezone || 'UTC');
      const { error } = await supabase.from("transactions").insert({
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
        category_id: "",
        amount: "",
        description: "",
        date: toZonedTime(new Date().toISOString(), profile?.timezone || 'UTC'),
      });

      setShowTransactionModal(false);
      fetchTransactions();
    } catch (error) {
      console.error("Error adding transaction:", error);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      fetchTransactions();
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
  }

  const handleModalClose = () => {
    setShowTransactionModal(false);
    fetchTransactions();
  };

  const toggleYearExpand = (year: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedGroups(newExpanded);
  };

  const getAvailableYearsAndMonths = () => {
    const years = Array.from(
      new Set(
        allTransactions.map((t) => parseISO(t.assigned_date).getFullYear())
      )
    ).sort((a, b) => b - a);
    const months = Array.from(
      new Set(
        allTransactions.map((t) => format(parseISO(t.assigned_date), "MMMM"))
      )
    );
    return { years, months };
  };

  const { years, months } = getAvailableYearsAndMonths();

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

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Filter className="w-5 h-5 text-gray-500" />
          
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="all">All Accounts</option>
            <optgroup label="Bank Accounts">
              {accounts
                .filter(a => a.type === 'bank')
                .map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))
              }
            </optgroup>
            <optgroup label="Credit Cards">
              {accounts
                .filter(a => a.type === 'credit')
                .map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))
              }
            </optgroup>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="recent">Recent (31 days)</option>
            <option value="current-month">Current Month</option>
            <option value="last-month">Last Month</option>
            <option value="last-3-months">Last 3 Months</option>
            <option value="custom">Custom</option>
          </select>

          {filterType === "custom" && (
            <div className="flex gap-2">
              <select
                value={customFilter.year}
                onChange={(e) =>
                  setCustomFilter({ ...customFilter, year: e.target.value })
                }
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <select
                value={customFilter.month}
                onChange={(e) =>
                  setCustomFilter({ ...customFilter, month: e.target.value })
                }
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                {months.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="min-w-full divide-y divide-gray-200">
          <div className="bg-gray-50 px-6 py-3">
            <h2 className="text-lg font-medium text-gray-900">
              Transaction History
            </h2>
          </div>
          {isLoading ? (
            <div className="p-6 text-center text-gray-500">
              Loading transactions...
            </div>
          ) : Object.keys(transactions).length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No transactions found
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {Object.entries(transactions)
                .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
                .map(([year, months]) => (
                  <div key={year} className="bg-white">
                    <button
                      onClick={() => toggleYearExpand(year)}
                      className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50"
                    >
                      <span className="text-lg font-medium text-gray-900">
                        {year}
                      </span>
                      {expandedGroups.has(year) ? (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                    {expandedGroups.has(year) && (
                      <div className="divide-y divide-gray-100">
                        {Object.entries(months)
                          .sort(([monthA], [monthB]) => {
                            const dateA = new Date(`${monthA} 1, ${year}`);
                            const dateB = new Date(`${monthB} 1, ${year}`);
                            return dateB.getTime() - dateA.getTime();
                          })
                          .map(([month, monthTransactions]) => (
                            <div
                              key={`${year}-${month}`}
                              className="bg-gray-50"
                            >
                              <div className="px-6 py-2 bg-gray-100">
                                <h3 className="text-sm font-medium text-gray-700">
                                  {month}
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
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showTransactionModal}
        onClose={handleModalClose}
        title="Add Transaction"
        size="full"
      >
        <AddTransactionForm
          formData={formData}
          onSubmit={handleSubmit}
          onChange={(data) => setFormData({ ...formData, ...data })}
          categories={categories}
          onClose={handleModalClose}
        />
      </Modal>
    </div>
  );
}
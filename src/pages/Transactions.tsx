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
  category?: {
    name: string;
  } | null;
}

interface Category {
  id: string;
  name: string;
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
  }, []);

  useEffect(() => {
    if (allTransactions.length > 0) {
      applyFilters();
    }
  }, [filterType, customFilter, allTransactions]);

  const sortTransactions = (a: Transaction, b: Transaction) => {
    const dateA = parseISO(a.assigned_date);
    const dateB = parseISO(b.assigned_date);
    const dateDiff = dateB.getTime() - dateA.getTime();

    // If dates are the same, sort by description
    if (dateDiff === 0) {
      return a.description.localeCompare(b.description);
    }
    return dateDiff;
  };

  const applyFilters = () => {
    let filteredTransactions = [...allTransactions];
    const now = new Date();

    switch (filterType) {
      case "recent":
        const thirtyOneDaysAgo = subDays(now, 31);
        filteredTransactions = allTransactions.filter((t) => {
          const date = parseISO(t.assigned_date);
          return isWithinInterval(date, {
            start: thirtyOneDaysAgo,
            end: endOfDay(now),
          });
        });
        break;
      case "current-month":
        filteredTransactions = allTransactions.filter((t) => {
          const date = parseISO(t.assigned_date);
          return isWithinInterval(date, {
            start: startOfMonth(now),
            end: endOfMonth(now),
          });
        });
        break;
      case "last-month":
        const lastMonth = subMonths(now, 1);
        filteredTransactions = allTransactions.filter((t) => {
          const date = parseISO(t.assigned_date);
          return isWithinInterval(date, {
            start: startOfMonth(lastMonth),
            end: endOfMonth(lastMonth),
          });
        });
        break;
      case "last-3-months":
        const threeMonthsAgo = subMonths(now, 3);
        filteredTransactions = allTransactions.filter((t) => {
          const date = parseISO(t.assigned_date);
          return isWithinInterval(date, {
            start: startOfMonth(threeMonthsAgo),
            end: endOfMonth(now),
          });
        });
        break;
      case "custom":
        filteredTransactions = allTransactions.filter((t) => {
          const date = parseISO(t.assigned_date);
          return (
            date.getFullYear().toString() === customFilter.year &&
            format(date, "MMMM") === customFilter.month
          );
        });
        break;
    }

    // Sort transactions by assigned date and description
    filteredTransactions.sort(sortTransactions);

    const groupedData = groupTransactionsByDate(filteredTransactions);
    setTransactions(groupedData);

    // Set all years as expanded by default
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

        // Sort transactions within each month by assigned date and description
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
          category:categories(name)
        `
        )
        .eq("user_id", user.id)
        .order("assigned_date", { ascending: false })
        .order("description", { ascending: true });

      if (error) throw error;

      // Convert UTC dates to local timezone for display
      const localData = data?.map(transaction => ({
        ...transaction,
        // date: toZonedTime(transaction.date, profile?.timezone || 'UTC'),
        //assigned_date: toZonedTime(transaction.assigned_date, profile?.timezone || 'UTC')
      })) || [];

      setAllTransactions(localData);
      const groupedData = groupTransactionsByDate(localData);
      setTransactions(groupedData);

      // Set all years as expanded by default
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

      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-500" />
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

      {/* Transactions List */}
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
                                    onDelete={handleDelete}
                                    onAssignedDateChange={fetchTransactions}
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
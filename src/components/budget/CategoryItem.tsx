import React, { useState, useEffect } from "react";
import { Trash2, Plus, ChevronRight, ChevronDown } from "lucide-react";
import { ProgressBar } from "./ProgressBar";
import { Category } from "../../types/category";
import { getTimeProgress } from "../../utils/timeProgress";
import { Modal } from "../shared/Modal";
import { AddTransactionForm } from "../transaction/AddTransactionForm";
import { TransactionItem } from "../transaction/TransactionItem";
import { useAuth } from "../../hooks/useContext";
import { supabase } from "../../lib/supabase";

interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string;
  assigned_date: string;
  allocation_id?: string;
}

interface CategoryItemProps {
  category: Category;
  timeframe: string;
  onDelete: (id: string) => void;
  onTransactionAdded: () => void;
}

interface AllocationStats {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  total_spent: number;
}

export function CategoryItem({
  category,
  timeframe,
  onDelete,
  onTransactionAdded,
}: CategoryItemProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allocationStats, setAllocationStats] = useState<AllocationStats[]>([]);
  const [selectedAllocation, setSelectedAllocation] = useState<string>("");
  const [formData, setFormData] = useState({
    category_id: category.id,
    allocation_id: "",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const spentPercentage = ((category.total_spent || 0) / category.amount) * 100;
  const timeProgress = getTimeProgress(category.timeframe);

  useEffect(() => {
    if (isExpanded || showTransactionModal) {
      fetchTransactions();
      if (category.type === "shared_income") {
        calculateAllocationStats();
      }
    }
  }, [category.type, isExpanded, showTransactionModal]);

  async function fetchTransactions() {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          id,
          amount,
          description,
          date,
          assigned_date,
          allocation_id
        `
        )
        .eq("category_id", category.id)
        .order("date", { ascending: false });

      if (error) throw error;
      console.log("Fetched transactions:", data);
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  }

  async function calculateAllocationStats() {
    console.log("Calculating allocation stats...");
    try {
      // Fetch allocations
      const { data: allocations, error: allocationsError } = await supabase
        .from("category_allocations")
        .select(
          `
          id,
          allocation_type,
          percentage,
          reference_category_id
        `
        )
        .eq("category_id", category.id);

      if (allocationsError) throw allocationsError;
      console.log("Fetched allocations:", allocations);

      // Calculate stats for each allocation
      const stats = await Promise.all(
        (allocations || []).map(async (allocation) => {
          let percentage = allocation.percentage || 0;
          let name = "";

          if (
            allocation.allocation_type === "dynamic" &&
            allocation.reference_category_id
          ) {
            // Fetch reference category details
            const { data: refCategory } = await supabase
              .from("categories")
              .select("name, total_spent")
              .eq("id", allocation.reference_category_id)
              .single();

            if (refCategory) {
              name = `Based on ${refCategory.name}`;
              const totalIncome = category.total_spent || 0;
              percentage =
                totalIncome > 0
                  ? ((refCategory.total_spent || 0) / totalIncome) * 100
                  : 0;
            }
          } else {
            name = `Manual Allocation (${allocation.percentage}%)`;
          }

          // Calculate total spent for this allocation
          const { data: allocationTransactions } = await supabase
            .from("transactions")
            .select("amount")
            .eq("category_id", category.id)
            .eq("allocation_id", allocation.id);

          const total_spent = (allocationTransactions || []).reduce(
            (sum, t) => sum + (t.amount || 0),
            0
          );

          return {
            id: allocation.id,
            name,
            percentage,
            amount: (category.amount * percentage) / 100,
            total_spent,
          };
        })
      );
      console.log("Calculated allocation stats:", stats);

      setAllocationStats(stats);
    } catch (error) {
      console.error("Error calculating allocation stats:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const { error } = await supabase.from("transactions").insert({
        user_id: user.id,
        category_id: category.id,
        allocation_id:
          category.type === "shared_income" ? selectedAllocation : null,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: formData.date,
        assigned_date: formData.date,
      });

      if (error) throw error;

      setFormData({
        category_id: category.id,
        allocation_id: "",
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
      setSelectedAllocation("");
      setShowTransactionModal(false);
      onTransactionAdded();
      if (isExpanded) {
        fetchTransactions();
        if (category.type === "shared_income") {
          calculateAllocationStats();
        }
      }
    } catch (error) {
      console.error("Error adding transaction:", error);
    }
  }

  return (
    <>
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>
                <h3 className="text-lg font-medium text-gray-900">
                  {category.name}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    ${category.total_spent?.toFixed(2) || "0.00"}
                    {category.amount_type === "fixed" && (
                      <>/${category.amount.toFixed(2)}</>
                    )}{" "}
                    {category.type === "spending" ? "spent" : "earned"}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      category.type === "shared_income"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {category.type === "shared_income"
                      ? "Shared Income"
                      : category.type}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTransactionModal(true)}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(category.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {category.amount_type === "fixed" && (
              <div className="mt-2">
                <ProgressBar
                  spentPercentage={spentPercentage}
                  timeProgress={timeProgress}
                />
              </div>
            )}

            {/* Allocations */}
            {category.type === "shared_income" && isExpanded && (
              <div className="mt-4 space-y-4">
                <h4 className="text-sm font-medium text-gray-700">
                  Allocations
                </h4>
                <div className="space-y-2">
                  {allocationStats.map((allocation) => (
                    <div
                      key={allocation.id}
                      className="bg-gray-50 p-3 rounded-lg"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">
                          {allocation.name}
                        </span>
                        <span className="text-sm text-gray-500">
                          {allocation.percentage.toFixed(1)}% • $
                          {allocation.total_spent.toFixed(2)}
                          {category.amount_type === "fixed" &&
                            ` / $${allocation.amount.toFixed(2)}`}
                        </span>
                      </div>
                      {category.amount_type === "fixed" && (
                        <ProgressBar
                          spentPercentage={
                            (allocation.total_spent / allocation.amount) * 100
                          }
                          timeProgress={timeProgress}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transactions List */}
            {isExpanded && (
              <div className="mt-4 space-y-2">
                {transactions.length === 0 ? (
                  <p className="text-sm text-gray-500">No transactions found</p>
                ) : (
                  transactions.map((transaction) => (
                    <TransactionItem
                      key={transaction.id}
                      id={transaction.id}
                      description={transaction.description}
                      amount={transaction.amount}
                      date={transaction.date}
                      assignedDate={transaction.assigned_date}
                      allocationId={transaction.allocation_id}
                      allocationName={
                        allocationStats.find(
                          (a) => a.id === transaction.allocation_id
                        )?.name
                      }
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        title="Add Transaction"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {category.type === "shared_income" && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Allocation
              </label>
              <select
                value={selectedAllocation}
                onChange={(e) => setSelectedAllocation(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              >
                <option value="">Select allocation</option>
                {allocationStats.map((allocation) => (
                  <option key={allocation.id} value={allocation.id}>
                    {allocation.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add Transaction
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

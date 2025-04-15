import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Plus } from "lucide-react";
import { TransactionItem } from "../components/transaction/TransactionItem";
import { Modal } from "../components/shared/Modal";
import { AddTransactionForm } from "../components/transaction/AddTransactionForm";

interface Transaction {
  id: string;
  budget_id: string | null;
  amount: number;
  description: string;
  date: string;
  budget?: {
    name: string;
  } | null;
}

interface Budget {
  id: string;
  name: string;
}

export function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [formData, setFormData] = useState({
    budget_id: "",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchTransactions();
    fetchBudgets();
  }, []);

  async function fetchTransactions() {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          id,
          budget_id,
          amount,
          description,
          date,
          budget:budgets(name)
        `
        )
        .eq("user_id", user.id);

      if (error) throw error;

      // Sort transactions by date
      const sortedTransactions = (data || []).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setTransactions(sortedTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchBudgets() {
    try {
      const { data, error } = await supabase
        .from("budgets")
        .select("id, name")
        .eq("user_id", user.id);

      if (error) throw error;
      setBudgets(data || []);
    } catch (error) {
      console.error("Error fetching budgets:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { error } = await supabase.from("transactions").insert({
        user_id: user.id,
        budget_id: formData.budget_id || null, // Allow null budget_id for income transactions
        amount: parseFloat(formData.amount), // Can be positive (income) or negative (expense)
        description: formData.description,
        date: formData.date,
      });

      if (error) throw error;

      setFormData({
        budget_id: "",
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
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

      {/* Transactions List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="min-w-full divide-y divide-gray-200">
          <div className="bg-gray-50 px-6 py-3">
            <h2 className="text-lg font-medium text-gray-900">
              Recent Transactions
            </h2>
          </div>
          {isLoading ? (
            <div className="p-6 text-center text-gray-500">
              Loading transactions...
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No transactions found
            </div>
          ) : (
            <div className="divide-y divide-gray-200 px-6">
              {transactions.map((transaction) => (
                <TransactionItem
                  key={transaction.id}
                  id={transaction.id}
                  description={transaction.description}
                  amount={transaction.amount}
                  date={transaction.date}
                  budgetName={transaction.budget?.name}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        title="Add Transaction"
      >
        <AddTransactionForm
          formData={formData}
          onSubmit={handleSubmit}
          onChange={(data) => setFormData({ ...formData, ...data })}
          budgets={budgets}
        />
      </Modal>
    </div>
  );
}

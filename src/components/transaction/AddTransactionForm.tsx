import React, { useState } from "react";
import { Plus } from "lucide-react";
import { CSVImport } from "./CSVImport";
import { Modal } from "../shared/Modal";

interface FormData {
  budget_id: string;
  amount: string;
  description: string;
  date: string;
}

interface CSVTransaction {
  date: string;
  description: string;
  amount: string;
  budget?: string;
}

interface AddTransactionFormProps {
  formData: FormData;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<FormData>) => void;
  budgets: Array<{ id: string; name: string }>;
  selectedBudgetId?: string;
  onBulkImport?: (transactions: CSVTransaction[]) => void;
  onClose?: () => void;
}

export function AddTransactionForm({
  formData,
  onSubmit,
  onChange,
  budgets,
  selectedBudgetId,
  onBulkImport,
  onClose,
}: AddTransactionFormProps) {
  const [activeTab, setActiveTab] = useState<"manual" | "bulk">("manual");
  const [importedTransactions, setImportedTransactions] = useState<CSVTransaction[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { error } = await supabase.from("transactions").insert({
        user_id: user.id,
        budget_id: formData.budget_id || null,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: formData.date,
        assigned_date: formData.date, // Set assigned_date equal to date by default
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

  const handleTransactionsLoaded = (transactions: CSVTransaction[]) => {
    setImportedTransactions(transactions);
    if (onBulkImport) {
      onBulkImport(transactions);
    }
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === "manual"
              ? "border-b-2 border-indigo-500 text-indigo-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("manual")}
        >
          Manual Import
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === "bulk"
              ? "border-b-2 border-indigo-500 text-indigo-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("bulk")}
        >
          Bulk Import
        </button>
      </div>

      {/* Manual Import Form */}
      {activeTab === "manual" && (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {!selectedBudgetId && (
              <div>
                <label
                  htmlFor="budget"
                  className="block text-sm font-medium text-gray-700"
                >
                  Budget
                </label>
                <select
                  id="budget"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.budget_id}
                  onChange={(e) => onChange({ budget_id: e.target.value })}
                  required
                >
                  <option value="">Select a budget</option>
                  {budgets.map((budget) => (
                    <option key={budget.id} value={budget.id}>
                      {budget.name}
                    </option>
                  ))}
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
              Add Transaction
            </button>
          </div>
        </form>
      )}

      {/* Bulk Import Form */}
      {activeTab === "bulk" && (
        <div className="space-y-6">
          <CSVImport
            onTransactionsLoaded={handleTransactionsLoaded}
            budgets={budgets}
            onClose={onClose}
          />
        </div>
      )}
    </div>
  );
}
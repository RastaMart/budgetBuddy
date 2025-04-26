import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { CSVImport } from "./CSVImport";
import { Modal } from "../shared/Modal";
import { useAuth } from "../../hooks/useContext";
import { supabase } from "../../lib/supabase";

interface FormData {
  category_id: string;
  allocation_id?: string;
  amount: string;
  description: string;
  date: string;
}

interface Category {
  id: string;
  name: string;
  type: 'spending' | 'income' | 'shared_income';
  budget: {
    id: string;
    name: string;
  };
}

interface AddTransactionFormProps {
  formData: FormData;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<FormData>) => void;
  categories: Category[];
  selectedCategoryId?: string;
  onBulkImport?: (transactions: any[]) => void;
  onClose?: () => void;
}

export function AddTransactionForm({
  formData,
  onSubmit,
  onChange,
  categories,
  selectedCategoryId,
  onBulkImport,
  onClose,
}: AddTransactionFormProps) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"manual" | "bulk">("manual");
  const [groupedCategories, setGroupedCategories] = useState<{[key: string]: Category[]}>({});

  useEffect(() => {
    // Group categories by budget
    const grouped = categories.reduce((acc: {[key: string]: Category[]}, category) => {
      const budgetName = category.budget?.name || 'Uncategorized';
      if (!acc[budgetName]) {
        acc[budgetName] = [];
      }
      acc[budgetName].push(category);
      return acc;
    }, {});
    setGroupedCategories(grouped);
  }, [categories]);

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
            {!selectedCategoryId && (
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
                  {Object.entries(groupedCategories).map(([budgetName, cats]) => (
                    <optgroup key={budgetName} label={budgetName}>
                      {cats.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </optgroup>
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
            onTransactionsLoaded={onBulkImport || (() => {})}
            categories={categories}
            onClose={onClose}
          />
        </div>
      )}
    </div>
  );
}
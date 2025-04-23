import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { CSVImport } from "./CSVImport";
import { Modal } from "../shared/Modal";
import { useAuth } from "../../hooks/useContext";
import { toZonedTime } from "date-fns-tz";
import { supabase } from "../../lib/supabase";

interface FormData {
  category_id: string;
  allocation_id?: string;
  amount: string;
  description: string;
  date: string;
}

interface CSVTransaction {
  date: string;
  description: string;
  amount: string;
  category?: string;
}

interface CategoryAllocation {
  id: string;
  allocation_type: 'manual' | 'dynamic';
  percentage: number;
  reference_category_id?: string;
  name?: string;
}

interface Category {
  id: string;
  name: string;
  type: 'spending' | 'income' | 'shared_income';
}

interface AddTransactionFormProps {
  formData: FormData;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<FormData>) => void;
  categories: Category[];
  selectedCategoryId?: string;
  onBulkImport?: (transactions: CSVTransaction[]) => void;
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
  const [importedTransactions, setImportedTransactions] = useState<CSVTransaction[]>([]);
  const [allocations, setAllocations] = useState<CategoryAllocation[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  useEffect(() => {
    if (selectedCategoryId || formData.category_id) {
      const categoryId = selectedCategoryId || formData.category_id;
      const category = categories.find(c => c.id === categoryId);
      setSelectedCategory(category || null);
      if (category?.type === 'shared_income') {
        fetchAllocations(categoryId);
      }
    }
  }, [selectedCategoryId, formData.category_id]);

  const handleTransactionsLoaded = (transactions: CSVTransaction[]) => {
    setImportedTransactions(transactions);
    if (onBulkImport) {
      onBulkImport(transactions);
    }
  };

  const handleCategoryChange = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    setSelectedCategory(category || null);
    onChange({ category_id: categoryId, allocation_id: undefined });
    
    if (category?.type === 'shared_income') {
      await fetchAllocations(categoryId);
    } else {
      setAllocations([]);
    }
  };

  const fetchAllocations = async (categoryId: string) => {
    console.log('fetchAllocations', categoryId);
    try {
      const { data, error } = await supabase
        .from('category_allocations')
        .select(`
          id,
          allocation_type,
          percentage,
          reference_category_id
        `)
        .eq('category_id', categoryId);

      if (error) throw error;

      // For each allocation, get the reference category name if it exists
      const allocationsWithNames = await Promise.all((data || []).map(async (allocation) => {
        let name = '';
        if (allocation.allocation_type === 'dynamic' && allocation.reference_category_id) {
          const { data: refCategory } = await supabase
            .from('categories')
            .select('name')
            .eq('id', allocation.reference_category_id)
            .single();
          
          if (refCategory) {
            name = `Based on ${refCategory.name}`;
          }
        } else {
          name = `Manual Allocation (${allocation.percentage}%)`;
        }

        return {
          ...allocation,
          name
        };
      }));

      setAllocations(allocationsWithNames);
    } catch (error) {
      console.error('Error fetching allocations:', error);
    }
  };

  // Get today's date in user's timezone
  const today = toZonedTime(new Date().toISOString(), profile?.timezone || 'UTC');

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
                  onChange={(e) => handleCategoryChange(e.target.value)}
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedCategory?.type === 'shared_income' && (
              <div>
                <label
                  htmlFor="allocation"
                  className="block text-sm font-medium text-gray-700"
                >
                  Allocation
                </label>
                <select
                  id="allocation"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.allocation_id}
                  onChange={(e) => onChange({ allocation_id: e.target.value })}
                  required
                >
                  <option value="">Select an allocation</option>
                  {allocations.map((allocation) => (
                    <option key={allocation.id} value={allocation.id}>
                      {allocation.name}
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
                value={formData.date || today}
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
            categories={categories}
            onClose={onClose}
          />
        </div>
      )}
    </div>
  );
}
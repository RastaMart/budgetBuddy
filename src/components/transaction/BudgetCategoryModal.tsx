import React, { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { Plus, ArrowLeft, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useContext';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { AddCategoryForm } from '../budget/AddCategoryForm';

interface Budget {
  id: string;
  name: string;
  categories: Category[];
}

interface Category {
  id: string;
  name: string;
  budget_id: string;
}

interface BudgetCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  description: string;
  onSelect: (
    categoryId: string,
    applyTo: 'single' | 'unassigned' | 'all'
  ) => void;
  currentCategoryId?: string;
  account_id?: string;
  skipConfirmation?: boolean;
}

export function BudgetCategoryModal({
  isOpen,
  onClose,
  description,
  onSelect,
  currentCategoryId,
  account_id,
  skipConfirmation = false,
}: BudgetCategoryModalProps) {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showCategorySelection, setShowCategorySelection] = useState(true);
  const [sameDescriptionCount, setSameDescriptionCount] = useState(0);
  const [unAssignedCount, setUnAssignedCount] = useState(0);
  const [saveAsRule, setSaveAsRule] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    timeframe: 'monthly' as 'weekly' | 'biweekly' | 'monthly' | 'yearly',
    type: 'spending' as 'spending' | 'income' | 'shared_income',
    amount_type: 'fixed' as 'fixed' | 'flexible',
  });

  // Get selected budget and category names
  const selectedBudget = budgets.find((b) => b.id === selectedBudgetId);
  const selectedCategory = selectedBudget?.categories.find(
    (c) => c.id === selectedCategoryId
  );

  useEffect(() => {
    if (isOpen) {
      fetchBudgets();
      if (!skipConfirmation) {
        fetchCounts();
      }
      setShowCategorySelection(true);
      setSaveAsRule(false);
    }
  }, [isOpen, description, skipConfirmation]);

  async function fetchBudgets() {
    try {
      const { data: budgetsData, error: budgetsError } = await supabase.from(
        'budgets'
      ).select(`
          id,
          name,
          categories (
            id,
            name,
            budget_id
          )
        `);

      if (budgetsError) throw budgetsError;

      // Sort budgets alphabetically
      const sortedBudgets =
        budgetsData
          ?.map((budget) => ({
            ...budget,
            categories: [...budget.categories].sort((a, b) =>
              a.name.localeCompare(b.name)
            ),
          }))
          .sort((a, b) => a.name.localeCompare(b.name)) || [];

      setBudgets(sortedBudgets);

      if (!selectedCategoryId && currentCategoryId) {
        const category = sortedBudgets
          ?.find((budget) =>
            budget.categories.some((cat) => cat.id === currentCategoryId)
          )
          ?.categories.find((cat) => cat.id === currentCategoryId);

        if (category) {
          setSelectedBudgetId(category.budget_id);
          setSelectedCategoryId(currentCategoryId);
        }
      }
    } catch (error) {
      console.error('Error fetching budgets:', error);
    }
  }

  async function fetchCounts() {
    try {
      // Count all transactions with the same description
      const { count: countSame } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', account_id)
        .eq('description', description)
        .neq('type', 'income_distribution');

      setSameDescriptionCount(countSame || 0);

      // Count all transactions with the same description
      const { count: countUnAssigned } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', account_id)
        .eq('description', description)
        .is('category_id', null)
        .neq('type', 'income_distribution');

      setUnAssignedCount(countUnAssigned || 0);
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  }

  const filteredBudgets = budgets.filter((budget) => {
    if (!searchTerm) return true;

    const budgetMatch = budget.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const categoryMatch = budget.categories.some((cat) =>
      cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return budgetMatch || categoryMatch;
  });

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    if (skipConfirmation) {
      onSelect(categoryId, 'single');
      onClose();
    } else {
      setShowCategorySelection(false);
    }
  };

  const handleSuccess = (newCategories: Category[]) => {
    setShowAddCategoryModal(false);
    fetchBudgets();
    if (newCategories && newCategories.length > 0) {
      handleCategorySelect(newCategories[0].id);
    }
  };

  const handleApply = async (applyTo: 'single' | 'unassigned' | 'all') => {
    if (selectedCategoryId && account_id) {
      if (saveAsRule) {
        // Save or update the rule using upsert
        try {
          const { error: ruleError } = await supabase
            .from('transaction_rules')
            .upsert(
              {
                user_id: user?.id,
                account_id: account_id,
                description: description,
                category_id: selectedCategoryId,
              },
              {
                onConflict: 'user_id,account_id,description',
                ignoreDuplicates: false,
              }
            );

          if (ruleError) throw ruleError;
        } catch (error) {
          console.error('Error saving rule:', error);
        }
      }

      onSelect(selectedCategoryId, applyTo);
      onClose();
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Select Budget & Category">
        <div className="space-y-6">
          {showCategorySelection ? (
            <>
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search budgets and categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>

              {/* Budget & Category List */}
              <div className="max-h-96 overflow-y-auto border rounded-lg divide-y">
                {filteredBudgets.map((budget) => (
                  <div key={budget.id} className="p-4">
                    <div
                      className="font-medium text-gray-900 cursor-pointer"
                      onClick={() =>
                        setSelectedBudgetId(
                          budget.id === selectedBudgetId ? null : budget.id
                        )
                      }
                    >
                      {budget.name}
                    </div>
                    {selectedBudgetId === budget.id && (
                      <div className="mt-2 ml-4 space-y-2">
                        {budget.categories
                          .filter(
                            (cat) =>
                              !searchTerm ||
                              cat.name
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase())
                          )
                          .map((category) => (
                            <div
                              key={category.id}
                              onClick={() => handleCategorySelect(category.id)}
                              className={`p-2 rounded cursor-pointer ${
                                selectedCategoryId === category.id
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : 'hover:bg-gray-100'
                              }`}
                            >
                              {category.name}
                            </div>
                          ))}
                        <button
                          onClick={() => {
                            setShowAddCategoryModal(true);
                          }}
                          className="w-full flex items-center gap-2 p-2 text-indigo-600 hover:bg-indigo-50 rounded"
                        >
                          <Plus className="w-4 h-4" />
                          Add new category
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center">
                <button
                  onClick={() => setShowCategorySelection(true)}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </button>
                <h3 className="text-lg font-medium text-gray-900 ml-4">
                  Categorize transaction "{description}" to{' '}
                  {selectedBudget?.name} - {selectedCategory?.name}
                </h3>
              </div>

              {selectedCategoryId && (
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="saveRule"
                      checked={saveAsRule}
                      onChange={(e) => setSaveAsRule(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="saveRule"
                      className="ml-2 block text-sm text-gray-900"
                    >
                      Save as a rule for future transactions
                    </label>
                  </div>

                  {saveAsRule ? (
                    <button
                      onClick={() => handleApply('all')}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Apply to all transactions ({sameDescriptionCount})
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleApply('single')}
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        Apply only to this transaction
                      </button>

                      {unAssignedCount > 1 && (
                        <button
                          onClick={() => handleApply('unassigned')}
                          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                          Apply to all uncategorized transactions (
                          {unAssignedCount})
                        </button>
                      )}
                      {sameDescriptionCount > 1 && (
                        <button
                          onClick={() => handleApply('all')}
                          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                          Apply to all transactions ({sameDescriptionCount})
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={showAddCategoryModal}
        onClose={() => setShowAddCategoryModal(false)}
        title="Add Category"
        size="large"
      >
        <AddCategoryForm
          formData={formData}
          onChange={(data) => setFormData({ ...formData, ...data })}
          budgetId={selectedBudgetId || ''}
          onSuccess={handleSuccess}
        />
      </Modal>
    </>
  );
}

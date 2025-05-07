import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useContext';
import { Plus } from 'lucide-react';
import { Budget } from '../types/budget';
import { Category } from '../types/category';
import { CategoryItem } from '../components/budget/CategoryItem';
import { AddCategoryForm } from '../components/budget/AddCategoryForm';
import { BudgetTabs } from '../components/budget/BudgetTabs';
import { BudgetHeader } from '../components/budget/BudgetHeader';
import { NewBudgetForm } from '../components/budget/NewBudgetForm';
import { ShareBudgetModal } from '../components/budget/ShareBudgetModal';
import { DeleteBudgetModal } from '../components/budget/DeleteBudgetModal';
import { EditAllocationsModal } from '../components/budget/EditAllocationsModal';
import { Modal } from '../components/shared/Modal';
import { Card } from '../components/shared/Card';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { EmptyState } from '../components/shared/EmptyState';
import {
  BudgetUser,
  fetchUserBudgets,
  createBudget,
  deleteBudget,
  fetchBudgetUsers,
  fetchCategories,
  createCategory,
  deleteCategory,
  updateBudgetOrder,
  shareBudgetWithUser,
} from '../services/budgetService';

export function Budgets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { budgetId } = useParams();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewBudgetModal, setShowNewBudgetModal] = useState(false);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditAllocationsModal, setShowEditAllocationsModal] = useState(false);
  const [budgetUsers, setBudgetUsers] = useState<Record<string, BudgetUser[]>>({});
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    timeframe: 'monthly' as 'weekly' | 'biweekly' | 'monthly' | 'yearly',
    type: 'spending' as 'spending' | 'income' | 'shared_income',
    amount_type: 'fixed' as 'fixed' | 'flexible',
  });

  useEffect(() => {
    fetchUserBudgetsData();
  }, []);

  useEffect(() => {
    if (budgets.length > 0) {
      if (budgetId && budgets.some(b => b.id === budgetId)) {
        setSelectedBudget(budgetId);
      } else {
        const firstBudgetId = budgets[0].id;
        setSelectedBudget(firstBudgetId);
        navigate(`/budgets/${firstBudgetId}`, { replace: true });
      }
    }
  }, [budgets, budgetId, navigate]);

  useEffect(() => {
    if (selectedBudget) {
      fetchCategoriesData();
      fetchBudgetUsersData(selectedBudget);
    }
  }, [selectedBudget]);

  const timeframes = ['weekly', 'biweekly', 'monthly', 'yearly'] as const;
  const timeframeLabels = {
    weekly: 'Weekly',
    biweekly: 'Bi-Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
  };

  // Sort categories alphabetically within their types
  const incomeCategories = categories
    .filter((cat) => cat.type === 'income' || cat.type === 'shared_income')
    .sort((a, b) => a.name.localeCompare(b.name));

  const spendingCategories = categories
    .filter((cat) => cat.type === 'spending')
    .sort((a, b) => a.name.localeCompare(b.name));

  const incomeTotals = incomeCategories.reduce(
    (acc, cat) => ({
      budgeted: acc.budgeted + cat.amount,
      actual: acc.actual + (cat.total_spent || 0),
    }),
    { budgeted: 0, actual: 0 }
  );

  const spendingTotals = spendingCategories.reduce(
    (acc, cat) => ({
      budgeted: acc.budgeted + cat.amount,
      actual: acc.actual + (cat.total_spent || 0),
    }),
    { budgeted: 0, actual: 0 }
  );

  async function fetchUserBudgetsData() {
    if (!user) throw new Error('User not found');

    try {
      setIsLoading(true);
      const data = await fetchUserBudgets(user.id);
      setBudgets(data);

      await Promise.all(
        data?.map((budget) => fetchBudgetUsersData(budget.id)) || []
      );
    } catch (error) {
      console.error('Error fetching budgets:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleBudgetSelect(budgetId: string) {
    setSelectedBudget(budgetId);
    navigate(`/budgets/${budgetId}`, { replace: true });
  }

  async function handleReorderBudgets(newBudgets: Budget[]) {
    setBudgets(newBudgets);
    try {
      await updateBudgetOrder(newBudgets);
    } catch (error) {
      console.error('Error saving budget order:', error);
      fetchUserBudgetsData();
    }
  }

  async function fetchBudgetUsersData(budgetId: string) {
    try {
      const users = await fetchBudgetUsers(budgetId);
      setBudgetUsers((prev) => ({
        ...prev,
        [budgetId]: users,
      }));
    } catch (error) {
      console.error('Error fetching budget users:', error);
    }
  }

  async function fetchCategoriesData() {
    if (!selectedBudget) return;

    try {
      const categoriesData = await fetchCategories(selectedBudget);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }

  async function handleCreateBudget(name: string) {
    if (!user) throw new Error('User not found');
    try {
      setIsLoading(true);
      await createBudget(name);
      const data = await fetchUserBudgets(user.id);
      setBudgets(data);

      if (data.length > 0) {
        setSelectedBudget(data[data.length - 1].id);
      }
      setShowNewBudgetModal(false);
    } catch (error) {
      console.error('Error creating budget:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateCategorySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) throw new Error('User not found');
    if (!selectedBudget) return;

    try {
      await createCategory(
        selectedBudget,
        user.id,
        formData.name,
        parseFloat(formData.amount),
        formData.timeframe,
        formData.type,
        formData.amount_type
      );

      setFormData({
        name: '',
        amount: '',
        timeframe: 'monthly',
        type: 'spending',
        amount_type: 'fixed'
      });
      setShowNewCategoryModal(false);
      fetchCategoriesData();
    } catch (error) {
      console.error('Error adding category:', error);
    }
  }

  async function handleDeleteCategorySubmit(id: string) {
    try {
      await deleteCategory(id);
      fetchCategoriesData();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  }

  async function handleShareBudgetSubmit(email: string) {
    if (!selectedBudget) return;

    try {
      await shareBudgetWithUser(selectedBudget, email);
      setShowShareModal(false);
      await fetchBudgetUsersData(selectedBudget);
    } catch (error) {
      console.error('Error sharing budget:', error);
    }
  }

  async function handleDeleteBudgetSubmit() {
    if (!selectedBudget) return;

    try {
      await deleteBudget(selectedBudget);
      setBudgets((prev) => prev.filter((b) => b.id !== selectedBudget));
      setSelectedBudget(budgets[0]?.id || null);
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting budget:', error);
    }
  }

  function handleEditAllocations() {
    setShowEditAllocationsModal(true);
  }

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const selectedBudgetUsers = selectedBudget
    ? budgetUsers[selectedBudget] || []
    : [];
  const currentBudget = budgets.find((b) => b.id === selectedBudget);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Budgets</h1>
      </div>

      <BudgetTabs
        budgets={budgets}
        selectedBudget={selectedBudget}
        budgetUsers={budgetUsers}
        onSelectBudget={handleBudgetSelect}
        onNewBudget={() => setShowNewBudgetModal(true)}
        onReorderBudgets={handleReorderBudgets}
      />

      {selectedBudget && (
        <BudgetHeader
          users={selectedBudgetUsers}
          onShare={() => setShowShareModal(true)}
          onDelete={() => setShowDeleteModal(false)}
          onEditAllocations={handleEditAllocations}
        />
      )}

      {selectedBudget && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Categories</h2>
            <button
              onClick={() => setShowNewCategoryModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </button>
          </div>

          {categories.length === 0 ? (
            <Card>
              <EmptyState
                title="No categories found"
                description="Add your first category to get started"
                action={{
                  label: 'Add Category',
                  onClick: () => setShowNewCategoryModal(true),
                }}
              />
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Income Categories Section */}
              {incomeCategories.length > 0 && (
                <Card>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-medium text-gray-900">
                      Income Categories
                    </h2>
                    <div className="text-sm text-gray-600">
                      <span className="mr-4">
                        Budgeted: ${incomeTotals.budgeted.toFixed(2)}
                      </span>
                      <span>
                        Actual: ${incomeTotals.actual.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {timeframes.map((timeframe) => {
                      const timeframeCategories = incomeCategories.filter(
                        (cat) => cat.timeframe === timeframe
                      );
                      if (timeframeCategories.length === 0) return null;

                      return (
                        <div key={timeframe}>
                          <div className="px-6 py-2 bg-gray-50">
                            <h3 className="text-sm font-medium text-gray-700">
                              {timeframeLabels[timeframe]}
                            </h3>
                          </div>
                          <div className="divide-y divide-gray-100">
                            {timeframeCategories.map((category) => (
                              <CategoryItem
                                key={category.id}
                                category={category}
                                onDelete={handleDeleteCategorySubmit}
                                onTransactionAdded={fetchCategoriesData}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Spending Categories Section */}
              {spendingCategories.length > 0 && (
                <Card>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-medium text-gray-900">
                      Spending Categories
                    </h2>
                    <div className="text-sm text-gray-600">
                      <span className="mr-4">
                        Budgeted: ${spendingTotals.budgeted.toFixed(2)}
                      </span>
                      <span>
                        Actual: ${spendingTotals.actual.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {timeframes.map((timeframe) => {
                      const timeframeCategories = spendingCategories.filter(
                        (cat) => cat.timeframe === timeframe
                      );
                      if (timeframeCategories.length === 0) return null;

                      return (
                        <div key={timeframe}>
                          <div className="px-6 py-2 bg-gray-50">
                            <h3 className="text-sm font-medium text-gray-700">
                              {timeframeLabels[timeframe]}
                            </h3>
                          </div>
                          <div className="divide-y divide-gray-100">
                            {timeframeCategories.map((category) => (
                              <CategoryItem
                                key={category.id}
                                category={category}
                                onDelete={handleDeleteCategorySubmit}
                                onTransactionAdded={fetchCategoriesData}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <Modal
        isOpen={showNewBudgetModal}
        onClose={() => setShowNewBudgetModal(false)}
        title="Create New Budget"
      >
        <NewBudgetForm
          onSubmit={handleCreateBudget}
          onCancel={() => setShowNewBudgetModal(false)}
        />
      </Modal>

      <Modal
        isOpen={showNewCategoryModal}
        onClose={() => setShowNewCategoryModal(false)}
        title="Add Category"
        size="large"
      >
        <AddCategoryForm
          formData={formData}
          onSubmit={handleCreateCategorySubmit}
          onChange={(data) => setFormData({ ...formData, ...data })}
          budgetId={selectedBudget || ''}
          onSuccess={fetchCategoriesData}
        />
      </Modal>

      <ShareBudgetModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onShare={handleShareBudgetSubmit}
      />

      <DeleteBudgetModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onDelete={handleDeleteBudgetSubmit}
        budgetName={currentBudget?.name || ''}
      />

      <EditAllocationsModal
        isOpen={showEditAllocationsModal}
        onClose={() => setShowEditAllocationsModal(false)}
        budgetId={selectedBudget || ''}
        onSave={fetchCategoriesData}
      />
    </div>
  );
}
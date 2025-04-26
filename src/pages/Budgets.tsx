import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useContext";
import { Plus } from "lucide-react";
import { Budget, Category } from "../types/budget";
import { CategoryItem } from "../components/budget/CategoryItem";
import { AddCategoryForm } from "../components/budget/AddCategoryForm";
import { BudgetTabs } from "../components/budget/BudgetTabs";
import { BudgetHeader } from "../components/budget/BudgetHeader";
import { NewBudgetForm } from "../components/budget/NewBudgetForm";
import { ShareBudgetModal } from "../components/budget/ShareBudgetModal";
import { DeleteBudgetModal } from "../components/budget/DeleteBudgetModal";
import { Modal } from "../components/shared/Modal";
import {
  BudgetUser,
  fetchUserBudgets,
  createBudget,
  deleteBudget,
  fetchBudgetUsers,
  shareBudgetWithUser,
  fetchCategories,
  createCategory,
  deleteCategory,
} from "../services/budgetService";

export function Budgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewBudgetModal, setShowNewBudgetModal] = useState(false);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [budgetUsers, setBudgetUsers] = useState<Record<string, BudgetUser[]>>({});
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    timeframe: "monthly" as "weekly" | "biweekly" | "monthly" | "yearly",
    type: "spending" as "spending" | "income" | "shared_income",
    amount_type: "fixed" as "fixed" | "flexible",
    allocations: [],
    allocation_type: "manual" as "manual" | "dynamic"
  });

  useEffect(() => {
    fetchUserBudgetsData();
  }, []);

  useEffect(() => {
    if (selectedBudget) {
      fetchCategoriesData();
      fetchBudgetUsersData(selectedBudget);
    }
  }, [selectedBudget]);

  const timeframes = ["weekly", "biweekly", "monthly", "yearly"] as const;
  const timeframeLabels = {
    weekly: "Weekly",
    biweekly: "Bi-Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
  };

  // Separate income and spending categories
  const incomeCategories = categories.filter(
    (cat) => cat.type === "income" || cat.type === "shared_income"
  );
  const spendingCategories = categories.filter((cat) => cat.type === "spending");

  async function fetchUserBudgetsData() {
    try {
      setIsLoading(true);
      const data = await fetchUserBudgets(user.id);
      setBudgets(data);

      if (data.length > 0 && !selectedBudget) {
        setSelectedBudget(data[0].id);
      }

      await Promise.all(data?.map((budget) => fetchBudgetUsersData(budget.id)) || []);
    } catch (error) {
      console.error("Error fetching budgets:", error);
    } finally {
      setIsLoading(false);
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
      console.error("Error fetching budget users:", error);
    }
  }

  async function fetchCategoriesData() {
    if (!selectedBudget) return;

    try {
      const categoriesData = await fetchCategories(selectedBudget);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }

  async function handleCreateBudget(name: string) {
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
      console.error("Error creating budget:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateCategorySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBudget) return;

    try {
      await createCategory(
        selectedBudget,
        user.id,
        formData.name,
        parseFloat(formData.amount),
        formData.timeframe,
        formData.type,
        formData.amount_type,
        formData.type === 'shared_income' ? formData.allocations : undefined
      );

      setFormData({
        name: "",
        amount: "",
        timeframe: "monthly",
        type: "spending",
        amount_type: "fixed",
        allocations: [],
        allocation_type: "manual"
      });
      setShowNewCategoryModal(false);
      fetchCategoriesData();
    } catch (error) {
      console.error("Error adding category:", error);
    }
  }

  async function handleDeleteCategorySubmit(id: string) {
    try {
      await deleteCategory(id);
      fetchCategoriesData();
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  }

  async function handleShareBudgetSubmit(email: string) {
    if (!selectedBudget) return;

    try {
      await shareBudgetWithUser(selectedBudget, email);
      setShowShareModal(false);
      await fetchBudgetUsersData(selectedBudget);
    } catch (error) {
      console.error("Error sharing budget:", error);
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
      console.error("Error deleting budget:", error);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          Loading budgets...
        </div>
      </div>
    );
  }

  const selectedBudgetUsers = selectedBudget ? budgetUsers[selectedBudget] || [] : [];
  const currentBudget = budgets.find((b) => b.id === selectedBudget);

  return (
    <div className="space-y-6">
      <BudgetTabs
        budgets={budgets}
        selectedBudget={selectedBudget}
        budgetUsers={budgetUsers}
        onSelectBudget={setSelectedBudget}
        onNewBudget={() => setShowNewBudgetModal(true)}
      />

      {selectedBudget && (
        <BudgetHeader
          users={selectedBudgetUsers}
          onShare={() => setShowShareModal(true)}
          onDelete={() => setShowDeleteModal(true)}
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
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              No categories found
            </div>
          ) : (
            <div className="space-y-6">
              {/* Income Categories Section */}
              {incomeCategories.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="bg-green-50 px-6 py-3 border-b border-green-100">
                    <h2 className="text-xl font-medium text-green-800">Income Categories</h2>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {timeframes.map((timeframe) => {
                      const timeframeCategories = incomeCategories.filter(
                        (cat) => cat.timeframe === timeframe
                      );
                      if (timeframeCategories.length === 0) return null;

                      return (
                        <div key={timeframe}>
                          <div className="px-6 py-2 bg-green-50">
                            <h3 className="text-sm font-medium text-green-700">
                              {timeframeLabels[timeframe]}
                            </h3>
                          </div>
                          <div className="divide-y divide-gray-100">
                            {timeframeCategories.map((category) => (
                              <CategoryItem
                                key={category.id}
                                category={category}
                                timeframe={timeframe}
                                onDelete={handleDeleteCategorySubmit}
                                onTransactionAdded={fetchCategoriesData}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Spending Categories Section */}
              {spendingCategories.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                    <h2 className="text-xl font-medium text-gray-900">Spending Categories</h2>
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
                                timeframe={timeframe}
                                onDelete={handleDeleteCategorySubmit}
                                onTransactionAdded={fetchCategoriesData}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
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
        budgetName={currentBudget?.name || ""}
      />
    </div>
  );
}
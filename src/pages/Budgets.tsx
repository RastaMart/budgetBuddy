import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useContext";
import { Plus, X } from "lucide-react";
import { Budget, Category } from "../types/budget";
import { CategorySection } from "../components/budget/CategorySection";
import { AddCategoryForm } from "../components/budget/AddCategoryForm";
import { BudgetTabs } from "../components/budget/BudgetTabs";
import { BudgetHeader } from "../components/budget/BudgetHeader";
import { NewBudgetForm } from "../components/budget/NewBudgetForm";
import { ShareBudgetModal } from "../components/budget/ShareBudgetModal";
import { DeleteBudgetModal } from "../components/budget/DeleteBudgetModal";
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
  const [showForm, setShowForm] = useState(false);
  const [showNewBudgetForm, setShowNewBudgetForm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [budgetUsers, setBudgetUsers] = useState<Record<string, BudgetUser[]>>(
    {}
  );
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    timeframe: "monthly" as "weekly" | "monthly" | "yearly",
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

  async function fetchUserBudgetsData() {
    try {
      setIsLoading(true);
      const data = await fetchUserBudgets(user.id);
      setBudgets(data);

      // Select first budget by default
      if (data.length > 0 && !selectedBudget) {
        setSelectedBudget(data[0].id);
      }

      // Fetch users for all budgets
      await Promise.all(
        data?.map((budget) => fetchBudgetUsersData(budget.id)) || []
      );
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

      // Select the newly created budget
      if (data.length > 0) {
        setSelectedBudget(data[data.length - 1].id);
      }
      setShowNewBudgetForm(false);
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
        formData.timeframe
      );

      setFormData({
        name: "",
        amount: "",
        timeframe: "monthly",
      });
      setShowForm(false);
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

  const selectedBudgetUsers = selectedBudget
    ? budgetUsers[selectedBudget] || []
    : [];
  const currentBudget = budgets.find((b) => b.id === selectedBudget);

  return (
    <div className="space-y-6">
      {/* Budget Tabs */}
      <BudgetTabs
        budgets={budgets}
        selectedBudget={selectedBudget}
        budgetUsers={budgetUsers}
        onSelectBudget={setSelectedBudget}
        onNewBudget={() => setShowNewBudgetForm(true)}
      />

      {/* Budget Actions */}
      {selectedBudget && (
        <BudgetHeader
          users={selectedBudgetUsers}
          onShare={() => setShowShareModal(true)}
          onDelete={() => setShowDeleteModal(true)}
        />
      )}

      {/* New Budget Form */}
      {showNewBudgetForm && (
        <NewBudgetForm
          onSubmit={handleCreateBudget}
          onCancel={() => setShowNewBudgetForm(false)}
        />
      )}

      {/* Categories Section */}
      {selectedBudget && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Categories</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {showForm ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </>
              )}
            </button>
          </div>

          {showForm && (
            <AddCategoryForm
              formData={formData}
              onSubmit={handleCreateCategorySubmit}
              onChange={(data) => setFormData({ ...formData, ...data })}
            />
          )}

          {categories.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              No categories found
            </div>
          ) : (
            <div className="space-y-6">
              <CategorySection
                categories={categories}
                timeframe="weekly"
                onDelete={handleDeleteCategorySubmit}
                onTransactionAdded={fetchCategoriesData}
              />
              <CategorySection
                categories={categories}
                timeframe="monthly"
                onDelete={handleDeleteCategorySubmit}
                onTransactionAdded={fetchCategoriesData}
              />
              <CategorySection
                categories={categories}
                timeframe="yearly"
                onDelete={handleDeleteCategorySubmit}
                onTransactionAdded={fetchCategoriesData}
              />
            </div>
          )}
        </>
      )}

      {/* Modals */}
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

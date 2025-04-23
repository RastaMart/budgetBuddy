import { supabase } from "../lib/supabase";
import { Budget, Category, CategoryAllocation } from "../types/budget";

export interface BudgetUser {
  user_id: string;
  role: "owner" | "member";
  profiles: {
    email: string;
    name: string | null;
    avatar_url: string | null;
  };
}

export async function fetchUserBudgets(userId: string): Promise<Budget[]> {
  const { data, error } = await supabase
    .from("budgets")
    .select(
      `
      id,
      name,
      budget_users!inner(user_id)
    `
    )
    .eq("budget_users.user_id", userId);

  if (error) throw error;
  return data || [];
}

export async function createBudget(name: string): Promise<void> {
  const { error } = await supabase.from("budgets").insert({ name });
  if (error) throw error;
}

export async function deleteBudget(budgetId: string): Promise<void> {
  const { error } = await supabase.from("budgets").delete().eq("id", budgetId);
  if (error) throw error;
}

export async function fetchBudgetUsers(budgetId: string): Promise<BudgetUser[]> {
  const { data, error } = await supabase
    .from("budget_users")
    .select(
      `
      user_id,
      role
    `
    )
    .eq("budget_id", budgetId);

  if (error) throw error;

  if (data && data.length > 0) {
    const userIds = data.map((user) => user.user_id);

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, name, avatar_url")
      .in("id", userIds);

    if (profilesError) throw profilesError;

    return data.map((user) => {
      const profile = profilesData?.find((p) => p.id === user.user_id);
      return {
        ...user,
        profiles: profile
          ? {
              email: profile.email,
              name: profile.name,
              avatar_url: profile.avatar_url,
            }
          : null,
      };
    });
  }

  return [];
}

export async function shareBudgetWithUser(
  budgetId: string,
  email: string
): Promise<void> {
  const { data: userData, error: userError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (userError) throw userError;
  if (!userData) throw new Error("User not found");

  const { error: shareError } = await supabase.from("budget_users").insert({
    budget_id: budgetId,
    user_id: userData.id,
    role: "member",
  });

  if (shareError) throw shareError;
}

export async function fetchCategories(budgetId: string): Promise<Category[]> {
  const { data: categoriesData, error: categoriesError } = await supabase
    .from("categories")
    .select("*")
    .eq("budget_id", budgetId)
    .order("created_at", { ascending: false });

  if (categoriesError) throw categoriesError;
  
  const categoriesWithSpending = await Promise.all(
    (categoriesData || []).map(async (category) => {
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("transactions")
        .select("amount")
        .eq("category_id", category.id);

      if (transactionsError) throw transactionsError;

      const totalSpent = (transactionsData || []).reduce(
        (sum, transaction) => sum + Number(transaction.amount),
        0
      );

      // Fetch allocations for shared income categories
      let allocations: CategoryAllocation[] = [];
      if (category.type === 'shared_income') {
        const { data: allocationsData, error: allocationsError } = await supabase
          .from("category_allocations")
          .select("*")
          .eq("category_id", category.id);

        if (allocationsError) throw allocationsError;
        allocations = allocationsData || [];
      }

      return {
        ...category,
        total_spent: totalSpent,
        allocations,
      };
    })
  );

  return categoriesWithSpending;
}

export async function createCategory(
  budgetId: string,
  userId: string,
  name: string,
  amount: number,
  timeframe: "weekly" | "biweekly" | "monthly" | "yearly",
  type: "spending" | "income" | "shared_income",
  amount_type: "fixed" | "flexible",
  allocations?: {
    allocation_type: 'manual' | 'dynamic';
    percentage?: number;
    reference_category_id?: string;
  }[]
): Promise<void> {
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .insert({
      budget_id: budgetId,
      user_id: userId,
      name,
      amount: amount_type === 'fixed' ? amount : 0,
      timeframe,
      type,
      amount_type,
    })
    .select()
    .single();

  if (categoryError) throw categoryError;

  if (type === 'shared_income' && allocations?.length) {
    const { error: allocationsError } = await supabase
      .from("category_allocations")
      .insert(
        allocations.map(allocation => ({
          category_id: category.id,
          ...allocation
        }))
      );

    if (allocationsError) throw allocationsError;
  }
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId);
  if (error) throw error;
}
import { supabase } from '../lib/supabase';
import { Budget, Category, CategoryAllocation } from '../types/budget';

export interface BudgetUser {
  user_id: string;
  role: 'owner' | 'member';
  profiles: {
    email: string;
    name: string | null;
    avatar_url: string | null;
  };
}

export async function fetchUserBudgets(userId: string): Promise<Budget[]> {
  const { data, error } = await supabase
    .from('budgets')
    .select(
      `
      id,
      name,
      display_order,
      budget_users!inner(user_id)
    `
    )
    .eq('budget_users.user_id', userId)
    .order('display_order');

  if (error) throw error;
  return data || [];
}

export async function updateBudgetOrder(budgets: Budget[]): Promise<void> {
  const updates = budgets.map((budget, index) => ({
    id: budget.id,
    name: budget.name,
    display_order: index,
  }));

  const { error } = await supabase
    .from('budgets')
    .upsert(updates, { onConflict: 'id' });

  if (error) throw error;
}

export async function createBudget(name: string): Promise<void> {
  // Get the highest display_order
  const { data: maxOrder } = await supabase
    .from('budgets')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrder?.display_order ?? -1) + 1;

  const { error } = await supabase
    .from('budgets')
    .insert({ name, display_order: nextOrder });

  if (error) throw error;
}

export async function deleteBudget(budgetId: string): Promise<void> {
  const { error } = await supabase.from('budgets').delete().eq('id', budgetId);
  if (error) throw error;
}

export async function fetchBudgetUsers(
  budgetId: string
): Promise<BudgetUser[]> {
  const { data, error } = await supabase
    .from('budget_users')
    .select(
      `
      user_id,
      role
    `
    )
    .eq('budget_id', budgetId);

  if (error) throw error;

  if (data && data.length > 0) {
    const userIds = data.map((user) => user.user_id);

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, name, avatar_url')
      .in('id', userIds);

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
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (userError) throw userError;
  if (!userData) throw new Error('User not found');

  const { error: shareError } = await supabase.from('budget_users').insert({
    budget_id: budgetId,
    user_id: userData.id,
    role: 'member',
  });

  if (shareError) throw shareError;
}

export async function fetchCategories(budgetId: string): Promise<Category[]> {
  const { data: categoriesData, error: categoriesError } = await supabase
    .from('categories')
    .select('*')
    .eq('budget_id', budgetId)
    .order('created_at', { ascending: false });

  if (categoriesError) throw categoriesError;

  const categoriesWithSpending = await Promise.all(
    (categoriesData || []).map(async (category) => {
      const { data: transactionsData, error: transactionsError } =
        await supabase
          .from('transactions')
          .select('amount')
          .eq('category_id', category.id);

      if (transactionsError) throw transactionsError;

      const totalSpent = (transactionsData || []).reduce(
        (sum, transaction) => sum + Number(transaction.amount),
        0
      );

      return {
        ...category,
        total_spent: totalSpent,
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
  timeframe: 'weekly' | 'biweekly' | 'monthly' | 'yearly',
  type: 'spending' | 'income' | 'shared_income',
  amount_type: 'fixed' | 'flexible'
): Promise<void> {
  if (type === 'shared_income') {
    // Fetch budget allocations
    const { data: allocations, error: allocationsError } = await supabase
      .from('budget_allocations')
      .select('*')
      .eq('budget_id', budgetId);

    if (allocationsError) throw allocationsError;

    // Calculate dynamic percentages
    const dynamicAllocations = allocations.filter(a => a.allocation_type === 'dynamic');
    if (dynamicAllocations.length > 0) {
      const totalDynamicAmount = await calculateTotalDynamicAmount(dynamicAllocations);
      
      for (const allocation of dynamicAllocations) {
        const referenceAmount = await getReferenceAmount(allocation.reference_category_id);
        allocation.percentage = totalDynamicAmount > 0 
          ? (referenceAmount / totalDynamicAmount) * 100 
          : 0;
      }
    }

    // Create a category for each allocation
    for (const allocation of allocations) {
      await supabase.from('categories').insert({
        budget_id: budgetId,
        user_id: userId,
        name: `${name} - ${allocation.name}`,
        amount: amount * (allocation.percentage / 100),
        timeframe,
        type,
        amount_type,
        shared_amount: amount,
        allocation_id: allocation.id
      });
    }
  } else {
    // Create a single category for non-shared types
    await supabase.from('categories').insert({
      budget_id: budgetId,
      user_id: userId,
      name,
      amount,
      timeframe,
      type,
      amount_type
    });
  }
}

async function calculateTotalDynamicAmount(allocations: any[]): Promise<number> {
  let total = 0;
  for (const allocation of allocations) {
    if (allocation.reference_category_id) {
      total += await getReferenceAmount(allocation.reference_category_id);
    }
  }
  return total;
}

async function getReferenceAmount(categoryId: string): Promise<number> {
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount')
    .eq('category_id', categoryId);

  return (transactions || []).reduce((sum, t) => sum + (t.amount || 0), 0);
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId);
  if (error) throw error;
}
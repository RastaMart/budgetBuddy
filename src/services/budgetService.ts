import { supabase } from '../lib/supabase';
import { Budget } from '../types/budget';

export interface BudgetUser {
  user_id: string;
  role: 'owner' | 'member';
  profile: {
    email: string;
    name: string | null;
    avatar_url: string | null;
  };
}

export async function fetchUserBudgets(userId: string) {
  try {
    const { data, error } = await supabase
      .from('budgets')
      .select(`
        id,
        name,
        display_order,
        budget_users!inner(user_id)
      `)
      .eq('budget_users.user_id', userId)
      .order('display_order');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching budgets:', error);
    throw error;
  }
}

export async function createBudget(name: string) {
  try {
    const { data: maxOrder } = await supabase
      .from('budgets')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrder?.display_order ?? -1) + 1;

    const { data, error } = await supabase
      .from('budgets')
      .insert({ name, display_order: nextOrder })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating budget:', error);
    throw error;
  }
}

export async function updateBudget(id: string, updates: Partial<Budget>) {
  try {
    const { data, error } = await supabase
      .from('budgets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating budget:', error);
    throw error;
  }
}

export async function deleteBudget(id: string) {
  try {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting budget:', error);
    throw error;
  }
}

export async function updateBudgetOrder(budgets: Budget[]) {
  try {
    const updates = budgets.map((budget, index) => ({
      id: budget.id,
      name: budget.name,
      display_order: index,
    }));

    const { error } = await supabase
      .from('budgets')
      .upsert(updates, { onConflict: 'id' });

    if (error) throw error;
  } catch (error) {
    console.error('Error updating budget order:', error);
    throw error;
  }
}

export async function fetchBudgetUsers(budgetId: string): Promise<BudgetUser[]> {
  try {
    const { data, error } = await supabase
      .from('budget_users')
      .select(`
        user_id,
        role,
        profiles!inner (
          email,
          name,
          avatar_url
        )
      `)
      .eq('budget_id', budgetId);

    if (error) throw error;

    return (data || []).map(item => ({
      user_id: item.user_id,
      role: item.role,
      profile: {
        email: item.profiles.email,
        name: item.profiles.name,
        avatar_url: item.profiles.avatar_url
      }
    }));
  } catch (error) {
    console.error('Error fetching budget users:', error);
    throw error;
  }
}

export async function shareBudgetWithUser(budgetId: string, email: string) {
  try {
    // First, find the user by email
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (userError) throw userError;
    if (!userData) throw new Error('User not found');

    // Then add them to budget_users
    const { error: shareError } = await supabase
      .from('budget_users')
      .insert({
        budget_id: budgetId,
        user_id: userData.id,
        role: 'member',
        profile_id: userData.id
      });

    if (shareError) throw shareError;
  } catch (error) {
    console.error('Error sharing budget:', error);
    throw error;
  }
}

export async function fetchCategories(budgetId: string) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select(`
        *,
        transactions (
          amount
        )
      `)
      .eq('budget_id', budgetId);

    if (error) throw error;

    return data.map(category => ({
      ...category,
      total_spent: category.transactions?.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0) || 0
    }));
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
}

export async function createCategory(
  budgetId: string,
  userId: string,
  name: string,
  amount: number,
  timeframe: string,
  type: string,
  amount_type: string
) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        budget_id: budgetId,
        user_id: userId,
        name,
        amount,
        timeframe,
        type,
        amount_type
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
}

export async function deleteCategory(categoryId: string) {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
}
import { supabase } from '../lib/supabase';
import { Transaction, TransactionFilters } from '../types/transaction';

export async function fetchTransactions(userId: string, filters?: TransactionFilters) {
  try {
    let query = supabase
      .from('transactions')
      .select(`
        id,
        category_id,
        amount,
        description,
        date,
        assigned_date,
        type,
        account_id,
        category:categories(name),
        account:accounts(name, icon)
      `)
      .eq('user_id', userId)
      .order('assigned_date', { ascending: false })
      .order('description', { ascending: true });

    if (filters?.accountId && filters.accountId !== 'all') {
      query = query.eq('account_id', filters.accountId);
    }

    if (filters?.startDate) {
      query = query.gte('assigned_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('assigned_date', filters.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
}

export async function createTransaction(transaction: Partial<Transaction>) {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert(transaction)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
}

export async function updateTransaction(id: string, updates: Partial<Transaction>) {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
}

export async function deleteTransaction(id: string) {
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
}
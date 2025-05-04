import { supabase } from '../lib/supabase';
import { Account, CreateAccountParams } from '../types/account';

export async function fetchAccounts(userId: string) {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching accounts:', error);
    throw error;
  }
}

export async function createAccount(userId: string, account: CreateAccountParams) {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        ...account,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
}

export async function updateAccount(id: string, updates: Partial<Account>) {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating account:', error);
    throw error;
  }
}

export async function deleteAccount(id: string) {
  try {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
}
import { AccountIconType } from '../utils/accountIcons';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  identifier: string;
  type: 'bank' | 'credit';
  icon: AccountIconType;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAccountParams {
  name: string;
  identifier: string;
  type: 'bank' | 'credit';
  icon: AccountIconType;
}
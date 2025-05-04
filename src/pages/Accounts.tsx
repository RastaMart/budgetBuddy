import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useContext';
import { Account } from '../types/account';
import { Modal } from '../components/shared/Modal';
import { accountIcons, AccountIconType } from '../utils/accountIcons';

export function Accounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [addFormData, setAddFormData] = useState({
    name: '',
    identifier: '',
    type: 'bank' as 'bank' | 'credit',
    icon: 'wallet' as AccountIconType,
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    identifier: '',
    type: 'bank' as 'bank' | 'credit',
    icon: 'wallet' as AccountIconType,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { error } = await supabase.from('accounts').insert({
        user_id: user?.id,
        name: addFormData.name,
        identifier: addFormData.identifier,
        type: addFormData.type,
        icon: addFormData.icon,
      });

      if (error) throw error;

      setAddFormData({
        name: '',
        identifier: '',
        type: 'bank',
        icon: 'wallet',
      });
      setShowAddModal(false);
      fetchAccounts();
    } catch (error) {
      console.error('Error adding account:', error);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccount) return;

    try {
      const { error } = await supabase
        .from('accounts')
        .update({
          name: editFormData.name,
          identifier: editFormData.identifier,
          type: editFormData.type,
          icon: editFormData.icon,
        })
        .eq('id', selectedAccount.id);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedAccount(null);
      fetchAccounts();
    } catch (error) {
      console.error('Error updating account:', error);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  }

  function openEditModal(account: Account) {
    setSelectedAccount(account);
    setEditFormData({
      name: account.name,
      identifier: account.identifier,
      type: account.type,
      icon: account.icon,
    });
    setShowEditModal(true);
  }

  const AccountForm = ({ onSubmit, isEdit = false }: { onSubmit: (e: React.FormEvent) => void, isEdit?: boolean }) => {
    const formData = isEdit ? editFormData : addFormData;
    const setFormData = isEdit ? setEditFormData : setAddFormData;

    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Account Name
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="e.g., My Personal Account"
            required
          />
        </div>

        <div>
          <label
            htmlFor="identifier"
            className="block text-sm font-medium text-gray-700"
          >
            Account Identifier
          </label>
          <input
            type="text"
            id="identifier"
            value={formData.identifier}
            onChange={(e) =>
              setFormData({ ...formData, identifier: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Account/Card number"
            required
          />
        </div>

        <div>
          <label
            htmlFor="type"
            className="block text-sm font-medium text-gray-700"
          >
            Account Type
          </label>
          <select
            id="type"
            value={formData.type}
            onChange={(e) =>
              setFormData({
                ...formData,
                type: e.target.value as 'bank' | 'credit',
              })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          >
            <option value="bank">Bank Account</option>
            <option value="credit">Credit Card</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account Icon
          </label>
          <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto">
            {Object.entries(accountIcons).map(([name, Icon]) => (
              <button
                key={name}
                type="button"
                onClick={() => setFormData({ ...formData, icon: name as AccountIconType })}
                className={`p-3 rounded-lg flex items-center justify-center ${
                  formData.icon === name
                    ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-500'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-6 h-6" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => isEdit ? setShowEditModal(false) : setShowAddModal(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {isEdit ? 'Update Account' : 'Add Account'}
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Accounts</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          Loading accounts...
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          No accounts found. Add your first account to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const AccountIcon = accountIcons[account.icon];
            return (
              <div
                key={account.id}
                className="bg-white rounded-lg shadow overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <AccountIcon className="w-6 h-6 text-gray-400" />
                      <h2 className="ml-2 text-lg font-medium text-gray-900">
                        {account.name}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(account)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="text-red-400 hover:text-red-500"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500 font-mono">
                      {account.identifier}
                    </p>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        account.type === 'bank'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {account.type === 'bank' ? 'Bank Account' : 'Credit Card'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Account"
      >
        <AccountForm onSubmit={handleSubmit} />
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Account"
      >
        <AccountForm onSubmit={handleEdit} isEdit />
      </Modal>
    </div>
  );
}
import React from 'react';
import { Modal } from '../shared/Modal';
import { Transaction } from '../../types/transaction';
import { Account } from '../../types/account';

interface BulkActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTransactions: Transaction[];
  accounts: Account[];
  onUpdateAccount: (accountId: string) => void;
  onUpdateDate: (date: string) => void;
  onDelete: () => void;
  onCategorize: () => void;
}

export function BulkActionsModal({
  isOpen,
  onClose,
  selectedTransactions,
  accounts = [],
  onUpdateAccount,
  onUpdateDate,
  onDelete,
  onCategorize,
}: BulkActionsModalProps) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Bulk Actions (${selectedTransactions.length} selected)`}
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Update Account</h3>
          <select
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            onChange={(e) => onUpdateAccount(e.target.value)}
          >
            <option value="">Select an account</option>
            <optgroup label="Bank Accounts">
              {accounts
                ?.filter((a) => a.type === 'bank')
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Credit Cards">
              {accounts
                ?.filter((a) => a.type === 'credit')
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
            </optgroup>
          </select>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Update Date</h3>
          <input
            type="date"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            onChange={(e) => onUpdateDate(e.target.value)}
          />
        </div>

        <div className="flex justify-between">
          <button
            onClick={onCategorize}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Categorize
          </button>
          <button
            onClick={onDelete}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete Selected
          </button>
        </div>
      </div>
    </Modal>
  );
}
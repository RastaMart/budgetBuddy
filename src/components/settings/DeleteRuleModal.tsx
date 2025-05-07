import React from 'react';
import { Modal } from '../shared/Modal';

interface TransactionRule {
  id: string;
  description: string;
  account_id: string;
  accounts: {
    name: string;
  };
  categories: {
    name: string;
    budgets: {
      name: string;
    };
  };
}

interface DeleteRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  rule: TransactionRule;
}

export function DeleteRuleModal({ isOpen, onClose, onConfirm, rule }: DeleteRuleModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Rule">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Are you sure you want to delete this rule?
        </p>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="font-medium">{rule.description}</div>
          <div className="text-sm text-gray-500">
            {rule.accounts.name} → {rule.categories?.budgets?.name} - {rule.categories?.name}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}
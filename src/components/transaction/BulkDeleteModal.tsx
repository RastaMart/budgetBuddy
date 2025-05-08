import React from 'react';
import { Modal } from '../shared/Modal';

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count: number;
}

export function BulkDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  count,
}: BulkDeleteModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Transactions">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Are you sure you want to delete {count} selected transactions? This action cannot be undone.
        </p>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
          >
            Delete Transactions
          </button>
        </div>
      </div>
    </Modal>
  );
}
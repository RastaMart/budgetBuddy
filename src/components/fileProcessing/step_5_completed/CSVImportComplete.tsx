import React from 'react';
import { ImportError } from '../../../types/csv';

interface CSVImportCompleteProps {
  importStats: {
    total: number;
    successful: number;
    failed: number;
    errors: ImportError[];
  };
  onClose?: () => void;
}

export function CSVImportComplete({
  importStats,
  onClose,
}: CSVImportCompleteProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Import Complete
        </h3>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-semibold text-gray-900">
              {importStats.total}
            </div>
            <div className="text-sm text-gray-500">Total Transactions</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-semibold text-green-600">
              {importStats.successful}
            </div>
            <div className="text-sm text-green-700">Successfully Imported</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-semibold text-red-600">
              {importStats.failed}
            </div>
            <div className="text-sm text-red-700">Failed to Import</div>
          </div>
        </div>

        {importStats.errors.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Failed Transactions
            </h4>
            <div className="bg-red-50 rounded-lg overflow-hidden">
              <div className="max-h-60 overflow-y-auto">
                <table className="min-w-full divide-y divide-red-200">
                  <thead className="bg-red-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-red-900">
                        Row
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-red-900">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-red-900">
                        Description
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-red-900">
                        Amount
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-red-900">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-200">
                    {importStats.errors.map((error, index) => (
                      <tr key={index} className="bg-red-50">
                        <td className="px-4 py-2 text-sm text-red-900">
                          {error.row}
                        </td>
                        <td className="px-4 py-2 text-sm text-red-900">
                          {error.data.date}
                        </td>
                        <td className="px-4 py-2 text-sm text-red-900">
                          {error.data.description}
                        </td>
                        <td className="px-4 py-2 text-sm text-red-900 text-right">
                          ${Math.abs(parseFloat(error.data.amount)).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-sm text-red-900">
                          {error.error}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

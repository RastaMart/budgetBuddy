import React from 'react';

interface CSVAmountTypeSelectorProps {
  onAmountTypeSelection: (singleColumn: boolean) => void;
}

export function CSVAmountTypeSelector({
  onAmountTypeSelection,
}: CSVAmountTypeSelectorProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900">
        Transaction Amount Format
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        How are your transactions organized?
      </p>
      <div className="mt-6 space-y-4">
        <button
          onClick={() => onAmountTypeSelection(true)}
          className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <h4 className="text-sm font-medium">Single Amount Column</h4>
          <p className="mt-1 text-xs text-gray-500">
            All transactions are in one column (positive for deposits, negative
            for spending)
          </p>
        </button>
        <button
          onClick={() => onAmountTypeSelection(false)}
          className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <h4 className="text-sm font-medium">Separate Columns</h4>
          <p className="mt-1 text-xs text-gray-500">
            Deposits and spending are in separate columns
          </p>
        </button>
      </div>
    </div>
  );
}

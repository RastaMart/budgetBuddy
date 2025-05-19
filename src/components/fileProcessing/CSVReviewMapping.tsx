import React, { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { RawTransaction } from '../../types/transaction';
import { ColumnMapping } from '../../types/columnMapping';

interface CCSVReviewMappingProps {
  rawTransactions: RawTransaction[];
  rawContent: string;
  onRefuseMap: () => void;
  onAcceptMapping: (columnMapping: ColumnMapping) => void;
}

export function CSVReviewMapping({
  rawTransactions,
  rawContent,
  onRefuseMap,
  onAcceptMapping,
}: CCSVReviewMappingProps) {
  // const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>({});

  // Get 3 random transactions for preview
  const sampleTransactions = useMemo(() => {
    const previewCount = 20;
    if (!rawTransactions.length) return [];

    // Create a copy to avoid modifying the original array
    const shuffled = [...rawTransactions];

    // if (rawTransactions.length > previewCount) {
    //   // Fisher-Yates shuffle algorithm
    //   for (let i = shuffled.length - 3; i > 1; i--) {
    //     const j = Math.floor(Math.random() * (i + 1));
    //     [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    //   }

    //   // Return first 3 or less if fewer exist
    //   return [
    //     rawTransactions[0],
    //     ...shuffled.slice(0, Math.min(previewCount - 2, shuffled.length)),
    //     rawTransactions[rawTransactions.length - 1],
    //   ];
    // }
    return shuffled;
  }, [rawTransactions]);

  const handleAcceptMapping = () => {
    // Perform any necessary actions when the mapping is accepted
    onAcceptMapping({
      date: 3,
      description: 5,
      amount: undefined,
      expenseAmount: 7,
      incomeAmount: 8,
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Review Mapping</h3>
        </div>

        {/* Sample transactions preview */}
        <div className="p-4">
          {sampleTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sampleTransactions.map((transaction, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500">
                        {transaction.date ? (
                          format(parseISO(transaction.date), 'yyyy-MM-dd')
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500">
                        {transaction.description}
                      </td>
                      <td className="px-2 py-2whitespace-nowrap text-sm text-gray-500">
                        {transaction.amount >= 0 ? '+' : ''}
                        {transaction.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No transactions to display</p>
          )}
        </div>

        {/* Raw content */}
        <div className="p-4 border-t">
          <h4 className="text-md font-medium mb-2">Raw CSV Content</h4>
          <textarea
            className="w-full h-32 p-2 border border-gray-300 rounded-md font-mono text-sm"
            value={rawContent}
            readOnly
          />
        </div>
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Review Mapping
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Does this mapping is right?
              </p>
            </div>
            <div className="space-x-3">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={onRefuseMap}
              >
                Map manually
              </button>
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={handleAcceptMapping}
              >
                Looks good
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

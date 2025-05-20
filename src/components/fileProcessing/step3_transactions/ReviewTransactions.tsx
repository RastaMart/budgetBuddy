import { format, parseISO } from 'date-fns';
import { Amount } from '../../shared/Amount';
import { useAccounts } from '../../../hooks/useAccounts';
import { RawTransaction } from '../../../types/transaction';

interface ReviewTransactionsProps {
  transactions: RawTransaction[];
  selectedAccount: string | null;
  onSelectAccount: (accountId: string) => void;
  onToggleTransaction: (index: number) => void;
  onToggleAllTransactions: (selected: boolean) => void;
  onImport: () => void;
  onCancel?: () => void;
}

export function ReviewTransactions({
  transactions,
  selectedAccount,
  onSelectAccount,
  onToggleTransaction,
  onToggleAllTransactions,
  onImport,
  onCancel,
}: ReviewTransactionsProps) {
  const { accounts } = useAccounts();

  const handleSelectAccount = (e: { target: { value: string } }) => {
    onSelectAccount(e.target.value);
  };
  const handleToggleTransaction = (index: number) => {
    onToggleTransaction(index);
  };
  const handleToggleAllTransaction = (e: { target: { checked: boolean } }) => {
    onToggleAllTransactions(e.target.checked);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            Review Transactions
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Select which transactions to import. Duplicates are unselected by
            default.
          </p>
        </div>

        <div className="p-4 border-b">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Account
          </label>
          <select
            value={selectedAccount || ''}
            onChange={handleSelectAccount}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          >
            <option value="">Select an account</option>
            <optgroup label="Bank Accounts">
              {accounts
                .filter((a) => a.type === 'bank')
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Credit Cards">
              {accounts
                .filter((a) => a.type === 'credit')
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
            </optgroup>
          </select>
        </div>

        <div className="overflow-x-auto max-h-[60vh]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="sticky top-0 bg-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <input
                    type="checkbox"
                    checked={transactions.every((t) => t.selected)}
                    onChange={handleToggleAllTransaction}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((transaction, index) => (
                <tr
                  key={index}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={transaction.selected}
                      onChange={() => handleToggleTransaction(index)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-4 py-2">
                    {transaction.isDuplicate ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Duplicate
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        New
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">
                    {format(parseISO(transaction.date), 'PPP')}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {transaction.description}
                  </td>
                  <td className="px-4 py-2 text-sm text-right whitespace-nowrap">
                    <Amount value={transaction.amount} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {transactions.filter((t) => t.selected).length} of{' '}
              {transactions.length} transactions selected
            </div>
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={onImport}
                disabled={
                  !transactions.some((t) => t.selected) || !selectedAccount
                }
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import Selected
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

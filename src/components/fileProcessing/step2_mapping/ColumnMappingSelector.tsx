import { ColumnMapping } from '../../../types/columnMapping';
import { CSVData } from '../../../types/csv';

interface ColumnMappingSelectorProps {
  csvData: CSVData;
  columnMapping: ColumnMapping;
  onColumnSelect: (columnIndex: number) => void;
  title: string;
  description: string;
}

export function ColumnMappingSelector({
  csvData,
  columnMapping,
  onColumnSelect,
  title,
  description,
}: ColumnMappingSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="sticky top-0 bg-white">
              <tr>
                {csvData.headers &&
                  csvData.headers.map((header, i) => (
                    <th
                      key={i}
                      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-50 ${
                        Object.values(columnMapping).includes(i)
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-500'
                      }`}
                      onClick={() => onColumnSelect(i)}
                    >
                      {header}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {csvData.rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={`px-4 py-2 text-sm whitespace-nowrap ${
                        Object.values(columnMapping).includes(j)
                          ? 'text-indigo-900 bg-indigo-50'
                          : 'text-gray-500'
                      }`}
                      onClick={() => onColumnSelect(j)}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

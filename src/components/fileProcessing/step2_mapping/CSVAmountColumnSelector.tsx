import { CSVColumnMapping } from './CSVColumnMapping';
import { CSVData } from '../../../types/csv';

interface CSVAmountColumnSelectorProps {
  csvData: CSVData;
  columnMapping: {
    date?: number;
    description?: number;
    amount?: number;
    spending?: number;
    deposit?: number;
  };
  onColumnSelect: (columnIndex: number) => void;
}

export function CSVAmountColumnSelector({
  csvData,
  columnMapping,
  onColumnSelect,
}: CSVAmountColumnSelectorProps) {
  return (
    <CSVColumnMapping
      csvData={csvData}
      columnMapping={columnMapping}
      onColumnSelect={onColumnSelect}
      title="Select Amount Column"
      description="Click on the column header or any cell in the column that contains transaction amounts"
    />
  );
}

import { CSVColumnMapping } from './CSVColumnMapping';
import { CSVData } from '../../../types/csv';

interface CSVDescriptionColumnSelectorProps {
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

export function CSVDescriptionColumnSelector({
  csvData,
  columnMapping,
  onColumnSelect,
}: CSVDescriptionColumnSelectorProps) {
  return (
    <CSVColumnMapping
      csvData={csvData}
      columnMapping={columnMapping}
      onColumnSelect={onColumnSelect}
      title="Select Description Column"
      description="Click on the column header or any cell in the column that contains transaction descriptions"
    />
  );
}

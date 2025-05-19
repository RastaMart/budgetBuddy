import { CSVColumnMapping } from './CSVColumnMapping';
import { CSVData } from '../../../types/csv';
import { ColumnMapping } from '../../../types/columnMapping';

interface CSVDateColumnSelectorProps {
  csvData: CSVData;
  columnMapping: ColumnMapping;
  onColumnSelect: (columnIndex: number) => void;
}

export function CSVDateColumnSelector({
  csvData,
  columnMapping,
  onColumnSelect,
}: CSVDateColumnSelectorProps) {
  return (
    <CSVColumnMapping
      csvData={csvData}
      columnMapping={columnMapping}
      onColumnSelect={onColumnSelect}
      title="Select Date Column"
      description="Click on the column header or any cell in the column that contains transaction dates"
    />
  );
}

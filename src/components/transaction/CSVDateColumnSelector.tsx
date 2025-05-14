import React from 'react';
import { CSVColumnMapping } from './CSVColumnMapping';
import { CSVPreview } from '../../types/csv';

interface CSVDateColumnSelectorProps {
  csvPreview: CSVPreview;
  columnMapping: {
    date?: number;
    description?: number;
    amount?: number;
    spending?: number;
    deposit?: number;
  };
  onColumnSelect: (columnIndex: number) => void;
}

export function CSVDateColumnSelector({
  csvPreview,
  columnMapping,
  onColumnSelect,
}: CSVDateColumnSelectorProps) {
  return (
    <CSVColumnMapping
      csvPreview={csvPreview}
      columnMapping={columnMapping}
      onColumnSelect={onColumnSelect}
      title="Select Date Column"
      description="Click on the column header or any cell in the column that contains transaction dates"
    />
  );
}

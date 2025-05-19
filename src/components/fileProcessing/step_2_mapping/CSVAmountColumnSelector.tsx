import React from 'react';
import { CSVColumnMapping } from './CSVColumnMapping';
import { CSVPreview } from '../../types/csv';

interface CSVAmountColumnSelectorProps {
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

export function CSVAmountColumnSelector({
  csvPreview,
  columnMapping,
  onColumnSelect,
}: CSVAmountColumnSelectorProps) {
  return (
    <CSVColumnMapping
      csvPreview={csvPreview}
      columnMapping={columnMapping}
      onColumnSelect={onColumnSelect}
      title="Select Amount Column"
      description="Click on the column header or any cell in the column that contains transaction amounts"
    />
  );
}

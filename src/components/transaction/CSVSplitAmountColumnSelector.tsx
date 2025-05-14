import React from 'react';
import { CSVColumnMapping } from './CSVColumnMapping';
import { CSVPreview } from '../../types/csv';

interface CSVSplitAmountColumnSelectorProps {
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

export function CSVSplitAmountColumnSelector({
  csvPreview,
  columnMapping,
  onColumnSelect,
}: CSVSplitAmountColumnSelectorProps) {
  return (
    <CSVColumnMapping
      csvPreview={csvPreview}
      columnMapping={columnMapping}
      onColumnSelect={onColumnSelect}
      title={
        columnMapping.spending
          ? 'Select Deposit Column'
          : 'Select Spending Column'
      }
      description={
        columnMapping.spending
          ? 'Click on the column header or any cell in the column that contains deposit amounts'
          : 'Click on the column header or any cell in the column that contains spending amounts'
      }
    />
  );
}

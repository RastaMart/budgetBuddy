import { useState } from 'react';
import { ColumnMapping } from '../../../types/columnMapping';
import { CSVData, CSVTransaction } from '../../../types/csv';
import { RawTransaction } from '../../../types/transaction';
import { CSVAmountColumnSelector } from './CSVAmountColumnSelector';
import { CSVAmountTypeSelector } from './CSVAmountTypeSelector';
import { CSVDateColumnSelector } from './CSVDateColumnSelector';
import { CSVDescriptionColumnSelector } from './CSVDescriptionColumnSelector';
import { CSVReviewMapping } from './CSVReviewMapping';
import { CSVSplitAmountColumnSelector } from './CSVSplitAmountColumnSelector';
import { previousDay } from 'date-fns';
import {
  cleanAmount,
  cleanDescription,
  parseDate,
} from '../../../utils/dataParser';
import { formatCache } from '../../../services/csvProcessor/formatCache';
import { useAuth } from '../../../hooks/useContext';

interface StepMappingProps {
  confidence: number;
  csvData: CSVData;
  initialMapping: ColumnMapping;
  rawContent: string;
  rawTransactions: RawTransaction[];
  formatSignature: string;
  onMappingConfirmed: (mapping: ColumnMapping) => void;
}
export const StepMapping = ({
  confidence,
  csvData,
  initialMapping,
  rawContent,
  rawTransactions,
  formatSignature,
  onMappingConfirmed,
}: StepMappingProps) => {
  if (!csvData) return null;
  const { userId } = useAuth();
  if (!userId) {
    console.error('User not found');
    return null;
  }

  let initialStep: 'reviewMapping' | 'date' = 'date';
  if (confidence > 0.95) {
    onMappingConfirmed(initialMapping);
    return;
  }
  if (confidence > 0.5) {
    initialStep = 'reviewMapping';
  }
  const [mappingStep, setMappingStep] = useState<
    | 'reviewMapping'
    | 'date'
    | 'description'
    | 'amount-type'
    | 'amount'
    | 'amount-split'
  >(initialStep);
  const [mapping, setMapping] = useState<ColumnMapping>(initialMapping);

  const handleColumnSelect = async (columnIndex: number) => {
    // const newMapping = { ...mapping };

    switch (mappingStep) {
      case 'date':
        setMapping((prev) => ({
          ...prev,
          date: columnIndex,
        }));
        setMappingStep('description');
        break;
      case 'description':
        setMapping((prev) => ({
          ...prev,
          description: columnIndex,
        }));
        setMappingStep('amount-type');
        break;
      case 'amount':
        setMapping((prev) => ({
          ...prev,
          amount: columnIndex,
          expenseAmount: undefined,
          incomeAmount: undefined,
        }));
        // onMappingConfirmed(mapping);
        handleAcceptMapping(mapping);
        break;
      case 'amount-split':
        if (!mapping.expenseAmount) {
          setMapping((prev) => ({
            ...prev,
            amount: undefined,
            expenseAmount: columnIndex,
          }));
        } else {
          setMapping((prev) => ({
            ...prev,
            amount: undefined,
            incomeAmount: columnIndex,
          }));
          // onMappingConfirmed(mapping);
          handleAcceptMapping(mapping);
        }
        break;
    }
  };

  const handleAmountTypeSelection = (singleColumn: boolean) => {
    setIsSingleAmountColumn(singleColumn);
    setMappingStep(singleColumn ? 'amount' : 'amount-split');
  };

  const handleRefuseMapping = async () => {
    if (formatSignature) {
      await formatCache.deleteFormat(formatSignature);
    }
    setMapping({
      date: undefined,
      description: undefined,
      amount: undefined,
      expenseAmount: undefined,
      incomeAmount: undefined,
    });
    setMappingStep('date');
  };
  const handleAcceptMapping = async (newMapping: ColumnMapping) => {
    setMapping(newMapping);
    await formatCache.saveFormat(formatSignature, newMapping, userId);
    onMappingConfirmed(newMapping);
  };

  switch (mappingStep) {
    case 'date':
      return (
        <CSVDateColumnSelector
          csvData={csvData}
          columnMapping={initialMapping}
          onColumnSelect={handleColumnSelect}
        />
      );
    case 'description':
      return (
        <CSVDescriptionColumnSelector
          csvData={csvData}
          columnMapping={initialMapping}
          onColumnSelect={handleColumnSelect}
        />
      );
    case 'amount-type':
      return (
        <CSVAmountTypeSelector
          onAmountTypeSelection={handleAmountTypeSelection}
        />
      );
    case 'amount':
      return (
        <CSVAmountColumnSelector
          csvData={csvData}
          columnMapping={initialMapping}
          onColumnSelect={handleColumnSelect}
        />
      );
    case 'amount-split':
      return (
        <CSVSplitAmountColumnSelector
          csvData={csvData}
          columnMapping={initialMapping}
          onColumnSelect={handleColumnSelect}
        />
      );
    case 'reviewMapping':
      return (
        <CSVReviewMapping
          rawTransactions={rawTransactions}
          rawContent={rawContent}
          onRefuseMap={handleRefuseMapping}
          onAcceptMapping={handleAcceptMapping}
        />
      );
  }
};

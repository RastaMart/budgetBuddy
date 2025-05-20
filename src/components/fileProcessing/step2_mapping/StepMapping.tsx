import { useState } from 'react';
import { ColumnMapping } from '../../../types/columnMapping';
import { CSVData } from '../../../types/csv';
import { RawTransaction } from '../../../types/transaction';
import { AmountTypeSelector } from './AmountTypeSelector';
import { ReviewMapping } from './ReviewMapping';
import { formatCache } from '../../../services/csvProcessor/formatCache';
import { useAuth } from '../../../hooks/useContext';
import { ColumnMappingSelector } from './ColumnMappingSelector';

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
        <ColumnMappingSelector
          csvData={csvData}
          columnMapping={mapping}
          onColumnSelect={handleColumnSelect}
          title="Select Date Column"
          description="Click on the column header or any cell in the column that contains transaction dates"
        />
      );
    case 'description':
      return (
        <ColumnMappingSelector
          csvData={csvData}
          columnMapping={mapping}
          onColumnSelect={handleColumnSelect}
          title="Select Description Column"
          description="Click on the column header or any cell in the column that contains transaction descriptions"
        />
      );
    case 'amount-type':
      return (
        <AmountTypeSelector onAmountTypeSelection={handleAmountTypeSelection} />
      );
    case 'amount':
      return (
        <ColumnMappingSelector
          csvData={csvData}
          columnMapping={mapping}
          onColumnSelect={handleColumnSelect}
          title="Select Amount Column"
          description="Click on the column header or any cell in the column that contains transaction amounts"
        />
      );
    case 'amount-split':
      return (
        <ColumnMappingSelector
          csvData={csvData}
          columnMapping={mapping}
          onColumnSelect={handleColumnSelect}
          title={
            mapping.expenseAmount
              ? 'Select Deposit Column'
              : 'Select Spending Column'
          }
          description={
            mapping.expenseAmount
              ? 'Click on the column header or any cell in the column that contains deposit amounts'
              : 'Click on the column header or any cell in the column that contains spending amounts'
          }
        />
      );
    case 'reviewMapping':
      return (
        <ReviewMapping
          rawTransactions={rawTransactions}
          rawContent={rawContent}
          onRefuseMap={handleRefuseMapping}
          onAcceptMapping={handleAcceptMapping}
        />
      );
  }
};

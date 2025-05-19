import { useState, useEffect } from 'react';
import {
  CSVData,
  CSVPreview,
  CSVTransaction,
  ImportError,
} from '../../types/csv';
import { Transaction, RawTransaction } from '../../types/transaction';
import {
  parseDate,
  cleanAmount,
  cleanDescription,
} from '../../utils/dataParser';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useContext';
import { CsvProcessor } from '../../services/csvProcessor/csvProcessor';
import {
  CSVProcessing,
  FileContentProcessing,
  FileContentProcessingResponse,
} from './step1_process/FileContentProcessing';
import { CSVDateColumnSelector } from './step2_mapping/CSVDateColumnSelector';
import { CSVDescriptionColumnSelector } from './step2_mapping/CSVDescriptionColumnSelector';
import { CSVAmountTypeSelector } from './step2_mapping/CSVAmountTypeSelector';
import { CSVAmountColumnSelector } from './step2_mapping/CSVAmountColumnSelector';
import { CSVSplitAmountColumnSelector } from './step2_mapping/CSVSplitAmountColumnSelector';
import { CSVReviewMapping } from './step2_mapping/CSVReviewMapping';
import { CSVReviewTransactions } from './step3_transactions/CSVReviewTransactions';
import { CSVImporting } from './step3_transactions/CSVImporting';
import { CSVImportComplete } from './step5_completed/CSVImportComplete';
import { CSVFormatedData, readCSVFile } from '../../utils/csvParser';
import { ColumnMapping } from '../../types/columnMapping';
import { UploadFile } from './step0_upload/UploadFile';
import { StepMapping } from './step2_mapping/StepMapping';
import StepTransactions from './step3_transactions/StepTransactions';

interface CSVImportProps {
  onTransactionsLoaded: (transactions: Transaction[]) => void;
  onClose?: () => void;
  file: File;
}
interface Steps {
  upload: {
    fileContent: string;
    csvData: CSVFormatedData;
  } | null;
  process: FileContentProcessingResponse | null;
  mapping: ColumnMapping | null;
  transactions: boolean | null;
  learn: boolean | null;
  complete: boolean | null;
}

export function CSVImport({
  onTransactionsLoaded,
  onClose,
  file,
}: CSVImportProps) {
  const csvProcessor = new CsvProcessor();
  const { user } = useAuth();
  if (!user) {
    throw new Error('User not found');
  }

  const emptyMapping: ColumnMapping = {
    date: undefined,
    description: undefined,
    amount: undefined,
    expenseAmount: undefined,
    incomeAmount: undefined,
  };

  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<Steps>({
    upload: null,
    process: null,
    mapping: null,
    transactions: null,
    learn: null,
    complete: null,
  });
  const [mappingStep, setMappingStep] = useState<
    | 'initial'
    | 'processing'
    | 'reviewMapping'
    | 'date'
    | 'description'
    | 'amount-type'
    | 'amount'
    | 'amount-split'
    | 'reviewTransaction'
    | 'importing'
    | 'complete'
    | 'error'
  >('initial');

  // const [importStats, setImportStats] = useState<{
  //   total: number;
  //   successful: number;
  //   failed: number;
  //   errors: ImportError[];
  // }>({ total: 0, successful: 0, failed: 0, errors: [] });
  // const [parsedTransactions, setParsedTransactions] = useState<
  //   CSVTransaction[]
  // >([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  // const [uploadedDocument, setUploadedDocument] = useState<{
  //   id: string;
  //   file_path: string;
  // } | null>(null);

  csvProcessor.init(user.id);

  // useEffect(() => {
  //   if (file) {
  //     processFile(file);
  //   }
  // }, [file]);

  // const processFile = async (file: File) => {
  //   try {
  //     setMappingStep('processing');
  //     setError(null);

  //     const content = await csvProcessor.uploadFile(file);
  //     if (!content) {
  //       throw new Error('Failed to read file content');
  //     }
  //     setRawContent(content);
  //     // processCSV
  //     const {
  //       success,
  //       rawTransactions: newRawTransactions,
  //       mapping,
  //       formatSignature: newFormatSignature,
  //       confidence,
  //       errorMessage,
  //     } = await csvProcessor.processCSV(content);

  //     if (!success && errorMessage) {
  //       throw new Error(errorMessage);
  //     }
  //     if (newFormatSignature) {
  //       setFormatSignature(newFormatSignature);
  //     }

  //     const { headers, rows, hasHeaders } = await readCSVFile(content);
  //     setCsvPreview({ headers, rows });

  //     if (success && confidence > 0.95 && mapping != null) {
  //       // setColumnMapping(mapping); // Done in handleAcceptMapping
  //       if (newRawTransactions) {
  //         await setRawTransactions(newRawTransactions);
  //       }
  //       await handleAcceptMapping(mapping, { headers, rows, hasHeaders });
  //     } else if (success && confidence > 0.3 && mapping != null) {
  //       await setColumnMapping(mapping);
  //       if (newRawTransactions) {
  //         await setRawTransactions(newRawTransactions);
  //       }
  //       setMappingStep('reviewMapping');
  //     } else {
  //       // Parse CSV content
  //       setMappingStep('date');
  //     }
  //   } catch (error) {
  //     console.error('Error processing CSV file:', error);

  //     setError(
  //       'Error processing CSV file. Please check the format and try again.'
  //     );
  //     setMappingStep('initial');
  //   }
  // };

  // const renderMappingStep = () => {
  //   if (!csvPreview || !columnMapping) return null;

  //   switch (mappingStep) {
  //     case 'date':
  //       return (
  //         <CSVDateColumnSelector
  //           csvPreview={csvPreview}
  //           columnMapping={columnMapping}
  //           onColumnSelect={handleColumnSelect}
  //         />
  //       );
  //     case 'description':
  //       return (
  //         <CSVDescriptionColumnSelector
  //           csvPreview={csvPreview}
  //           columnMapping={columnMapping}
  //           onColumnSelect={handleColumnSelect}
  //         />
  //       );
  //     case 'amount-type':
  //       return (
  //         <CSVAmountTypeSelector
  //           onAmountTypeSelection={handleAmountTypeSelection}
  //         />
  //       );
  //     case 'amount':
  //       return (
  //         <CSVAmountColumnSelector
  //           csvPreview={csvPreview}
  //           columnMapping={columnMapping}
  //           onColumnSelect={handleColumnSelect}
  //         />
  //       );
  //     case 'amount-split':
  //       return (
  //         <CSVSplitAmountColumnSelector
  //           csvPreview={csvPreview}
  //           columnMapping={columnMapping}
  //           onColumnSelect={handleColumnSelect}
  //         />
  //       );
  //     case 'reviewMapping':
  //       return (
  //         <CSVReviewMapping
  //           rawTransactions={rawTransactions}
  //           rawContent={rawContent}
  //           onRefuseMap={handleRefuseMapping}
  //           onAcceptMapping={handleAcceptMapping}
  //         />
  //       );
  //   }
  // };
  // const steps = {
  //   process: mappingStep === 'processing',
  //   mapping: ['date', 'description', 'amount-type', 'amount', 'amount-split'].includes(mappingStep),
  //   transactions: ['reviewTransaction', 'importing'].includes(mappingStep),
  //   learn: mappingStep === 'learn',
  //   complete: mappingStep === 'complete',
  // };

  const handleError = (error: string) => {
    setError(error);
    setMappingStep('error');
  };
  const handleFileUploaded = async (fileContent: string) => {
    const csvData = await readCSVFile(fileContent);
    setSteps((prev) => ({
      ...prev,
      upload: {
        fileContent,
        csvData,
      },
    }));
  };
  const handleFileProcessed = (response: FileContentProcessingResponse) => {
    console.log('handleFileProcessed', response);
    setSteps((prev) => ({
      ...prev,
      process: response,
    }));
  };
  const handleMappingConfirmed = (mapping: ColumnMapping) => {
    setSteps((prev) => ({
      ...prev,
      process: prev.process
        ? {
            ...prev.process,
            confidence: 1,
          }
        : null,
      mapping,
    }));
  };
  const getCurrentStep = () => {
    if (error) {
      return 'error';
    }
    if (
      steps.process?.rawTransactions &&
      steps.process?.mapping &&
      steps.process?.confidence >= 0.95
    ) {
      return 'transactions';
    }
    if (
      steps.process?.rawTransactions &&
      steps.process?.mapping &&
      steps.process?.confidence < 0.95
    ) {
      return 'mapping';
    }
    if (steps.upload?.fileContent) {
      return 'process';
    }
    return 'upload';
  };
  const currentStep = getCurrentStep();
  console.log('currentStep', currentStep, steps);
  return (
    <div className="space-y-4">
      {(() => {
        switch (currentStep) {
          case 'error':
            return <p>{error}</p>;
          case 'upload':
            return (
              <UploadFile
                file={file}
                onFileProcessed={handleFileUploaded}
                onError={handleError}
              />
            );
          case 'process': {
            if (steps.upload?.fileContent) {
              return (
                <FileContentProcessing
                  fileContent={steps.upload.fileContent}
                  onFileProcessed={handleFileProcessed}
                  onError={handleError}
                />
              );
            }
            return <p>Error in the processing file step</p>;
          }
          case 'mapping':
            if (
              steps.upload?.fileContent &&
              steps.upload?.csvData &&
              steps.process?.formatSignature &&
              steps.process?.rawTransactions &&
              steps.process?.rawTransactions.length > 0
            ) {
              return (
                <StepMapping
                  confidence={steps.process.confidence}
                  rawContent={steps.upload.fileContent}
                  csvData={steps.upload.csvData}
                  initialMapping={steps.process?.mapping || emptyMapping}
                  rawTransactions={steps.process?.rawTransactions}
                  formatSignature={steps.process?.formatSignature}
                  onMappingConfirmed={handleMappingConfirmed}
                />
              );
            }
            return <p>Error in the mapping step</p>;
          case 'transactions':
            if (
              steps.upload?.fileContent &&
              steps.upload?.csvData &&
              steps.process?.formatSignature &&
              steps.process?.rawTransactions &&
              steps.process?.rawTransactions.length > 0
            ) {
              return (
                <StepTransactions
                  transactions={steps.process?.rawTransactions}

                  // confidence={steps.process.confidence}
                  // rawContent={steps.upload.fileContent}
                  // csvData={steps.upload.csvData}
                  // initialMapping={steps.process?.mapping || emptyMapping}
                  // rawTransactions={steps.process?.rawTransactions}
                  // formatSignature={steps.process?.formatSignature}
                  // onMappingConfirmed={handleMappingConfirmed}
                />
              );
            }
            return <p>Error in the mapping step</p>;
          case 'learn':
            return <p>Learn step</p>;
          case 'complete':
            return <p>Complete step</p>;
          default:
            return <p>Error sequencing steps</p>;
        }
      })()}

      {mappingStep === 'reviewTransaction' && (
        <CSVReviewTransactions
          parsedTransactions={parsedTransactions}
          selectedAccount={selectedAccount}
          onSelectAccount={setSelectedAccount}
          onToggleTransaction={toggleTransactionSelection}
          onToggleAllTransactions={toggleAllTransactions}
          onImport={() => importTransactions(parsedTransactions)}
          onCancel={onClose}
        />
      )}
      {mappingStep === 'importing' && <CSVImporting />}
      {mappingStep === 'complete' && (
        <CSVImportComplete importStats={importStats} onClose={onClose} />
      )}
    </div>
  );
}

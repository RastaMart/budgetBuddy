import { useState } from 'react';
import { TransactionsImportStats } from '../../types/transaction';
import {
  FileContentProcessing,
  FileContentProcessingResponse,
} from './step1_process/FileContentProcessing';
import { CSVFormatedData, readCSVFile } from '../../utils/csvParser';
import { ColumnMapping } from '../../types/columnMapping';
import { UploadFile } from './step0_upload/UploadFile';
import { StepMapping } from './step2_mapping/StepMapping';
import StepTransactions from './step3_transactions/StepTransactions';
import { CSVImportComplete } from './step5_completed/CSVImportComplete';

interface Steps {
  upload: {
    fileContent: string;
    csvData: CSVFormatedData;
  } | null;
  process: FileContentProcessingResponse | null;
  mapping: ColumnMapping | null;
  transactions: {
    stats: TransactionsImportStats;
  } | null;
  learn: boolean | null;
  complete: boolean | null;
}
interface CSVImportProps {
  file: File;
  onClose: () => void;
  onTransactionsImported: (stats: TransactionsImportStats) => void;
}

export function CSVImport({
  file,
  onClose,
  onTransactionsImported,
}: CSVImportProps) {
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

  const handleError = (error: string) => {
    setError(error);
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
  const handleOnTransactionsCancel = () => {
    setSteps((prev) => ({
      ...prev,
      process: null,
      mapping: null,
      transactions: null,
    }));
    onClose();
  };
  const handleImportCompleted = (stats: TransactionsImportStats) => {
    setSteps((prev) => ({
      ...prev,
      transactions: {
        stats,
      },
    }));
    onTransactionsImported(stats);
  };

  const getCurrentStep = () => {
    if (error) {
      return 'error';
    }
    if (steps.transactions?.stats) {
      return 'complete';
    }
    // TODO : Learn step, for now go to complete step
    if (steps.transactions?.stats) {
      return 'learn';
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
                  onCancel={handleOnTransactionsCancel}
                  onImportCompleted={handleImportCompleted}
                />
              );
            }
            return <p>Error in the mapping step</p>;
          case 'learn':
            return <p>Learn step</p>;
          case 'complete':
            if (!steps.transactions?.stats) {
              return <p>Error in the import step</p>;
            }
            return (
              <CSVImportComplete
                importStats={steps.transactions.stats}
                onClose={onClose}
              />
            );
          default:
            return <p>Error sequencing steps</p>;
        }
      })()}
    </div>
  );
}

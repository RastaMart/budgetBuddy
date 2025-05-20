import { DropZone } from '../shared/DropZone';
import { Transaction, TransactionsImportStats } from '../../types/transaction';

interface FileProcessorProps {
  onTransactionsImported?: (stats: TransactionsImportStats) => void;
  className?: string;
}

function FileProcessor({
  onTransactionsImported = () => {},
  className = '',
}: FileProcessorProps) {
  const handleTransactionsImported = (stats: TransactionsImportStats) => {
    onTransactionsImported(stats);
  };

  return (
    <DropZone
      className={className}
      onTransactionsImported={handleTransactionsImported}
    />
  );
}
FileProcessor.whyDidYouRender = true;
export { FileProcessor };

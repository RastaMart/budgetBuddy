import React from 'react';
import { DropZone } from '../shared/DropZone';

interface CSVDropzoneProps {
  onFileSelect: (file: File) => void;
  error: string | null;
}

export function CSVDropzone({ onFileSelect, error }: CSVDropzoneProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium">Import CSV</h3>
      <DropZone onFileAccepted={onFileSelect} acceptedFileTypes={['.csv']} />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}

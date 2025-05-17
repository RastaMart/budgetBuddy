import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface DropZoneProps {
  onFileUpload: (file: File) => void;
  accept?: string;
  maxSize?: number;
}

export function DropZone({
  onFileUpload,
  accept = '.csv,.pdf', // Updated to accept CSV and PDF
  maxSize = 5242880,
}: DropZoneProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      console.log('DropZone onDrop');
      const file = acceptedFiles[0];
      if (!file) return;

      // Check file extension
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'csv' || fileExtension === 'pdf') {
        onFileUpload(file);
      } else {
        setError(`Only CSV and PDF files are supported`);
      }
    },
    [onFileUpload]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept,
    maxSize,
  });

  return (
    <div {...getRootProps()} className="dropzone">
      <input {...getInputProps()} />
      <p>Drag and drop a file here, or click to select a file</p>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

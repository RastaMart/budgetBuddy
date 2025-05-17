import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';

interface DropZoneProps {
  onFileAccepted: (file: File) => void;
  acceptedFileTypes?: string[];
  maxSize?: number;
  className?: string;
  children?: React.ReactNode;
}

export function DropZone({
  onFileAccepted,
  acceptedFileTypes = ['.csv', '.pdf'],
  maxSize = 5242880, // 5MB
  className = '',
  children,
}: DropZoneProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const isAccepted = acceptedFileTypes
        .map((type) => type.replace('.', '').toLowerCase())
        .includes(fileExtension || '');

      if (isAccepted) {
        setError(null);
        onFileAccepted(file);
      } else {
        setError(`Only ${acceptedFileTypes.join(', ')} files are supported`);
      }
    },
    [onFileAccepted, acceptedFileTypes]
  );

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    open: openFileDialog,
  } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce(
      (acc, type) => {
        // Convert from e.g. '.csv' to an accept object like { 'text/csv': ['.csv'] }
        const mimeType =
          type === '.csv'
            ? 'text/csv'
            : type === '.pdf'
              ? 'application/pdf'
              : `application/${type.replace('.', '')}`;
        acc[mimeType] = [type];
        return acc;
      },
      {} as Record<string, string[]>
    ),
    maxSize,
    noClick: !!children, // Disable click if children are provided (to prevent double handlers)
  });

  // Update isDragging state based on isDragActive from useDropzone
  React.useEffect(() => {
    setIsDragging(isDragActive);
  }, [isDragActive]);

  return (
    <div
      {...getRootProps()}
      className={`relative border-2 border-dashed rounded-lg p-8 text-center ${
        isDragging
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-gray-300 bg-gray-50'
      } ${className}`}
    >
      <input {...getInputProps()} />

      {children || (
        <>
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            Drag and drop your {acceptedFileTypes.join(' or ')} file here, or{' '}
            <button
              type="button"
              className="text-indigo-600 hover:text-indigo-500"
              onClick={(e) => {
                e.stopPropagation();
                openFileDialog();
              }}
            >
              browse
            </button>
          </p>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </>
      )}
    </div>
  );
}

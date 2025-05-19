import { useEffect } from 'react';
import { CsvProcessor } from '../../../services/csvProcessor/csvProcessor';
import { useAuth } from '../../../hooks/useContext';

interface UploadFileProps {
  file: File;
  onFileProcessed: (rawString: string) => void;
  onError: (error: string) => void;
}

export function UploadFile({
  file,
  onFileProcessed,
  onError,
}: UploadFileProps) {
  const { userId } = useAuth();
  if (!userId) {
    throw new Error('User not found');
  }

  const csvProcessor = new CsvProcessor();
  csvProcessor.init(userId);

  useEffect(() => {
    if (file) {
      processFile(file);
    }
  }, [file]);

  const processFile = async (file: File) => {
    try {
      const content = await csvProcessor.uploadFile(file);
      if (content) {
        onFileProcessed(content);
      } else {
        onError('No file content');
      }
    } catch (error) {
      console.error('Errorreading file:', error);
      onError('Error getting file');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Upload file...</span>
      </div>
    </div>
  );
}

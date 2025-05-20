import { useEffect, useRef } from 'react';
import { FileProcessor } from '../../../services/csvProcessor/fileProcessor';
import { useAuth } from '../../../hooks/useContext';

interface UploadFileProps {
  file: File;
  onFileProcessed: (rawString: string) => void;
  onError: (error: string) => void;
}

function UploadFile({ file, onFileProcessed, onError }: UploadFileProps) {
  const hasRun = useRef(false);

  const { userId } = useAuth();
  if (!userId) {
    throw new Error('User not found');
  }

  const fileProcessor = new FileProcessor();
  fileProcessor.init(userId);

  useEffect(() => {
    if (!hasRun.current && file) {
      hasRun.current = true;
      processFile(file);
    }
  }, [file]);

  const processFile = async (file: File) => {
    try {
      const content = await fileProcessor.uploadFile(file);
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
UploadFile.whyDidYouRender = true;
export { UploadFile };

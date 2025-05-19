import React, { useEffect, useState } from 'react';
import { PdfProcessor } from '../../services/pdfProcessor/pdfProcessor';
import { useAuth } from '../../hooks/useContext';

interface PDFReviewAnalysisProps {
  pdfFile: File;
  onClose: () => void;
  onAccept: () => void;
}

function PDFReviewAnalysis({
  pdfFile,
  onClose,
  onAccept,
}: PDFReviewAnalysisProps) {
  console.log('PDFReviewAnalysis');
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // console.log('PDFReviewAnalysis useEffect', pdfFile, user, error);

    processPDF();
  }, []);

  const processPDF = async () => {
    console.log('processPDF');
    try {
      if (!user) throw new Error('User not found');

      const pdfProcessor = new PdfProcessor();
      pdfProcessor.init(user.id);

      const filePath = await pdfProcessor.uploadFile(pdfFile);
      if (!filePath) {
        // Check if error is due to duplicate file
        if (error?.includes('duplicate key value')) {
          throw new Error('This PDF has already been processed');
        }
        throw new Error('Failed to upload PDF');
      }

      const result = await pdfProcessor.processPDF(filePath);
      if (!result.success) {
        throw new Error(result.errorMessage || 'Failed to process PDF');
      }

      setAnalysisResult(result.data);
    } catch (err) {
      console.error('Error processing PDF:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while processing PDF'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">PDF Analysis</h2>

      {isProcessing && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Processing PDF file...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 p-4 rounded-md border border-red-200">
          <p className="text-red-600">{error}</p>
          {error.includes('already been processed') && (
            <p className="mt-2 text-sm text-red-500">
              Please select a different PDF file or check your uploaded
              documents.
            </p>
          )}
        </div>
      )}

      {!isProcessing && !error && analysisResult && (
        <div className="bg-white p-4 rounded-md border">
          <h3 className="text-lg font-medium mb-2">Extracted Data</h3>
          <pre className="bg-gray-50 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(analysisResult, null, 2)}
          </pre>

          <div className="mt-8 flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onAccept}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Accept
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
PDFReviewAnalysis.whyDidYouRender = true;
export { PDFReviewAnalysis };

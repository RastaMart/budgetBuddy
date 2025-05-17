import React from 'react';

interface PDFReviewAnalysisProps {
  pdfFile: File;
  onClose: () => void;
  onAccept: () => void;
}

export function PDFReviewAnalysis({
  pdfFile,
  onClose,
  onAccept,
}: PDFReviewAnalysisProps) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Review PDF Analysis
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                We've analyzed your PDF document: {pdfFile.name}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-1 text-sm text-gray-500">
                PDF preview will appear here
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Process Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

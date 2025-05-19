import { getFileContent, uploadPDFFile } from '../storageService';

export interface PdfProcessResult {
  success: boolean;
  // rawTransactions?: RawTransaction[];
  formatSignature?: string;
  // mapping?: ColumnMapping;
  confidence: number;
  mappedFrom?: 'Cache' | 'Heuristic' | 'User';
  errorMessage?: string;
}

export class PdfProcessor {
  private userId: string | null = null;

  init(userId: string) {
    this.userId = userId;
    return this;
  }

  async uploadFile(file: File): Promise<string | null> {
    console.log('uploadFile');
    if (!this.userId) {
      console.error('File or user ID is not set');
      return null;
    }
    try {
      // Upload file to storage
      const document = await uploadPDFFile(file, this.userId);
      if (!document) {
        throw new Error('Failed to upload file');
      }

      // Get file content from storage
      const content = await getFileContent('pdf', document.file_path);
      if (!content) {
        throw new Error('Failed to read file content');
      }
      return content;
    } catch (error) {
      console.error('File upload error:', error);
      return null;
    }
  }

  async processPDF(pdfContent: string): Promise<PdfProcessResult> {
    try {
      // TODO: Implement PDF processing logic
      return {
        success: true,
        confidence: 0,
      };
    } catch (error) {
      console.error('Error processing PDF:', error);
      return {
        success: false,
        confidence: 0,
        errorMessage:
          error instanceof Error
            ? error.message
            : 'Unknown error processing PDF',
      };
    }
  }
}

import { parse } from 'papaparse';
import { formatCache } from './formatCache';
import CryptoJS from 'crypto-js';
import { getFileContent, uploadFile } from '../storageService';
import { csvMapper } from './csvMapper';
import { RawTransaction } from '../../types/transaction';
import { ColumnMapping } from '../../types/columnMapping';

export interface FileProcessorResult {
  success: boolean;
  rawTransactions?: RawTransaction[];
  formatSignature?: string;
  mapping?: ColumnMapping;
  confidence: number;
  mappedFrom?: 'Cache' | 'Heuristic' | 'User';
  errorMessage?: string;
}

export class FileProcessor {
  userId?: string;

  init(userId: string) {
    this.userId = userId;
  }

  async uploadFile(file: File): Promise<string | null> {
    if (!this.userId) {
      console.error('File or user ID is not set');
      return null;
    }
    try {
      // Upload file to storage
      const document = await uploadFile(file, this.userId);
      if (!document) {
        throw new Error('Failed to upload file');
      }

      // Get file content from storage
      const content = await getFileContent(document.file_path);
      if (!content) {
        throw new Error('Failed to read file content');
      }
      return content;
    } catch (error) {
      console.error('File upload error:', error);
      return null;
    }
  }

  async handleMappingRefuse(formatSignature: string) {
    if (!this.userId) {
      console.error('File or user ID is not set');
      return;
    }
    await formatCache.deleteFormat(formatSignature);
  }
  async handleMappingAccepted(formatSignature: string, mapping: ColumnMapping) {
    if (!this.userId) {
      console.error('File or user ID is not set');
      return;
    }
    await formatCache.saveFormat(formatSignature, mapping, this.userId);
  }

  async processCSV(csvContent: string): Promise<FileProcessorResult> {
    if (!this.userId) {
      console.error('File or user ID is not set');
      return {
        success: false,
        confidence: 0,
        errorMessage: 'userId is not set',
      };
    }
    try {
      // 1. Generate a format signature for this CSV
      const formatSignature = this.generateFormatSignature(csvContent);

      // 2. Check cache for known format
      const cachedMapping = await formatCache.getFormat(formatSignature);

      if (cachedMapping) {
        // Use the cached mapping if available
        return {
          formatSignature,
          ...csvMapper.processCsvWithMapping(csvContent, cachedMapping),
        };
      }

      // 3. If no cached mapping, detect columns using heuristics

      const { data } = parse(csvContent, {
        //header: true,
        skipEmptyLines: true,
      });
      if (!data.length) {
        return {
          success: false,
          confidence: 0,
          errorMessage: 'No data found in CSV',
          mappedFrom: 'Heuristic',
        };
      }

      const mapping = csvMapper.detectColumns(data);
      const confidence = csvMapper.calculateMappingConfidence(mapping);

      // 4. Process the data with the detected mapping
      const rawTransactions = csvMapper.mapDataToTransactions(data, mapping);

      return {
        success: true,
        rawTransactions,
        formatSignature,
        mapping,
        confidence,
        mappedFrom: 'Heuristic',
      };
    } catch (error) {
      console.error('CSV processing error:', error);
      return {
        success: false,
        confidence: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate a unique signature for this CSV format
   * Uses header row and sampling of data structure
   */
  private generateFormatSignature(csvContent: string): string {
    const { data, meta } = parse(csvContent, {
      preview: 5,
      skipEmptyLines: true,
    });
    // Create a signature based on headers and data structure
    const headerSignature = meta.fields?.join('|') || '';
    const structureSignature =
      data.length > 0 && typeof data[0] === 'object' && data[0] !== null
        ? Object.values(data[0] as Record<string, unknown>).join('|')
        : '';

    // Calculate file hash
    const hash = CryptoJS.SHA256(headerSignature + structureSignature);
    const signature = hash.toString(CryptoJS.enc.Hex).substring(0, 20);
    return signature;
  }
}

export const csvProcessor = new FileProcessor();
export default FileProcessor;

import { parse } from 'papaparse';
import { formatCache } from './formatCache';
import { nanoid } from 'nanoid';
import CryptoJS from 'crypto-js';
import sha256 from 'crypto-js/sha256';
import Hex from 'crypto-js/enc-hex';
import WordArray from 'crypto-js/lib-typedarrays';
import { ColumnMapping, CsvProcessResult } from '../../types/columnMapping';
import { RawTransaction } from '../../types/transaction';
import { getFileContent, uploadCSVFile } from '../storageService';
import { csvMapper } from './csvMapper';

export class CsvProcessor {
  csvContent?: string;
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
      const document = await uploadCSVFile(file, this.userId);
      if (!document) {
        throw new Error('Failed to upload file');
      }

      // Get file content from storage
      const content = await getFileContent(document.file_path);
      if (!content) {
        throw new Error('Failed to read file content');
      }
      this.csvContent = content;
      return content;
    } catch (error) {
      console.error('File upload error:', error);
      return null;
    }
  }

  async processCSV(
    csvContent: string // userId: string
  ): Promise<CsvProcessResult> {
    try {
      // 1. Generate a format signature for this CSV
      const formatSignature = this.generateFormatSignature(csvContent);
      // 2. Check cache for known format
      const cachedMapping = await formatCache.getFormat(formatSignature);
      console.log('Cached mapping:', cachedMapping);

      if (cachedMapping) {
        // Use the cached mapping if available
        return {
          ...csvMapper.processCsvWithMapping(csvContent, cachedMapping),
          mappedFrom: 'Cache',
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

      // 5. Cache the mapping if confidence is high enough
      //   if (confidence > 0.8) {
      //     await formatCache.saveFormat(formatSignature, mapping, userId);
      //   }

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
      data.length > 0 ? Object.values(data[0]).join('|') : '';

    // Calculate file hash
    const hash = CryptoJS.SHA256(headerSignature + structureSignature);

    return nanoid(10) + '-' + hash.toString(CryptoJS.enc.Hex).substring(0, 20);
  }
}

export const csvProcessor = new CsvProcessor();
export default CsvProcessor;

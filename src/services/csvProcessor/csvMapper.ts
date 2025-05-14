import { parse } from 'papaparse';
import { formatCache } from './formatCache';
import { nanoid } from 'nanoid';
import CryptoJS from 'crypto-js';
import sha256 from 'crypto-js/sha256';
import Hex from 'crypto-js/enc-hex';
import WordArray from 'crypto-js/lib-typedarrays';
import { ColumnMapping, CsvProcessResult } from '../../types/columnMapping';
import { RawTransaction } from '../../types/transaction';

const globalSampleSize = 10;

export class CsvMapper {
  /**
   * Detect likely columns in CSV data using heuristics
   */
  detectColumns(data: any[]): ColumnMapping {
    const mapping: ColumnMapping = {};
    const headers = Object.keys(data[0]);

    // Date detection
    mapping.date = this.findDateColumn(data, headers);

    // Description detection
    mapping.description = this.findDescriptionColumn(data, headers);

    // Amount detection (could be single amount or separate income/expense)
    const { amountColumn, incomeColumn, expenseColumn } =
      this.findAmountColumns(data, headers);

    if (amountColumn !== undefined) {
      mapping.amount = amountColumn;
    } else {
      mapping.incomeAmount = incomeColumn;
      mapping.expenseAmount = expenseColumn;
    }

    // Type detection (if separate columns aren't used)
    if (incomeColumn === undefined && expenseColumn === undefined) {
      mapping.type = this.findTypeColumn(data, headers);
    }

    return mapping;
  }

  /**
   * Find the most likely date column
   */
  private findDateColumn(data: any[], headers: string[]): number | undefined {
    // Define arrays of common date-related column names, ordered by likelihood
    const dateColumnNames = [
      'date',
      'transaction date',
      'trans date',
      'post date',
      'posting date',
      'date posted',
      'effective date',
      'trade date',
      'settlement date',
      'value date',
      'statement date',
      'purchase date',
      'payment date',
    ];

    // Common date formatting regexes
    const datePatterns = [
      // MM/DD/YYYY or DD/MM/YYYY formats
      /^([0-3]?[0-9])[\/\.-]([0-1]?[0-9])[\/\.-]([0-9]{4}|[0-9]{2})$/,
      /^([0-1]?[0-9])[\/\.-]([0-3]?[0-9])[\/\.-]([0-9]{4}|[0-9]{2})$/,
      // YYYY/MM/DD formats
      /^([0-9]{4})[\/\.-]([0-1]?[0-9])[\/\.-]([0-3][0-9])$/,
      // ISO format YYYY-MM-DD
      /^([0-9]{4})-([0-1][0-9])-([0-3][0-9])$/,
      // Month DD, YYYY
      /^[A-Za-z]{3,9}\s+[0-3]?[0-9],?\s+[0-9]{4}$/,
    ];

    // First, try to find by common date column names
    for (const dateName of dateColumnNames) {
      const columnIndex = headers.findIndex((header) =>
        header.toLowerCase().includes(dateName)
      );

      if (columnIndex !== -1) {
        // Verify that the column contents look like dates
        if (this.columnsContainsDateValues(data, columnIndex)) {
          return columnIndex;
        }
      }
    }

    // If no match by name, scan all columns for date-like values
    for (let i = 0; i < headers.length; i++) {
      if (this.columnsContainsDateValues(data, i)) {
        return i;
      }
    }

    return undefined;
  }

  /**
   * Helper method to verify if a column contains date values
   */
  private columnsContainsDateValues(data: any[], columnIndex: number): boolean {
    // Sample the first [globalSampleSize] rows or all rows if less than [globalSampleSize]
    const sampleSize = Math.min(globalSampleSize, data.length);
    let dateCount = 0;

    for (let i = 0; i < sampleSize; i++) {
      const value = data[i][Object.keys(data[i])[columnIndex]];

      if (!value) continue;

      const strValue = String(value).trim();

      // Skip empty values
      if (!strValue) continue;

      // Try to parse as date
      if (this.isLikelyDate(strValue)) {
        dateCount++;
      }
    }

    // If more than 70% of sample rows contain date values, consider it a date column
    return dateCount / sampleSize >= 0.7;
  }

  /**
   * Check if a string is likely to be a date
   */
  private isLikelyDate(value: string): boolean {
    // Common date formatting regexes
    const datePatterns = [
      // MM/DD/YYYY or DD/MM/YYYY formats
      /^([0-3]?[0-9])[\/\.-]([0-1]?[0-9])[\/\.-]([0-9]{4}|[0-9]{2})$/,
      /^([0-1]?[0-9])[\/\.-]([0-3]?[0-9])[\/\.-]([0-9]{4}|[0-9]{2})$/,
      // YYYY/MM/DD formats
      /^([0-9]{4})[\/\.-]([0-1]?[0-9])[\/\.-]([0-3][0-9])$/,
      // ISO format YYYY-MM-DD
      /^([0-9]{4})-([0-1][0-9])-([0-3][0-9])$/,
      // Month DD, YYYY
      /^[A-Za-z]{3,9}\s+[0-3]?[0-9],?\s+[0-9]{4}$/,
    ];

    // Check against date patterns
    for (const pattern of datePatterns) {
      if (pattern.test(value)) {
        return true;
      }
    }

    // // Try to create a Date object and see if it's valid
    // const dateObj = new Date(value);
    // if (!isNaN(dateObj.getTime())) {
    //   // Additional validation - check if the year is reasonable (not too far in past/future)
    //   const year = dateObj.getFullYear();
    //   const currentYear = new Date().getFullYear();

    //   const isDateValid = year >= 1990 && year <= currentYear + 1;
    //   console.log('date fromm new Date', dateObj);
    //   return isDateValid;
    // }

    return false;
  }

  /**
   * Find the most likely description column
   */
  private findDescriptionColumn(
    data: any[],
    headers: string[]
  ): number | undefined {
    // Common description column names
    const descriptionColumnNames = [
      'description',
      'memo',
      'transaction description',
      'narration',
      'details',
      'reference',
      'particulars',
      'transaction',
      'notes',
      'payee',
      'merchant',
      'vendor',
      'transaction detail',
      'remarks',
      'description/memo',
    ];

    // First try to match by common column names
    for (const descName of descriptionColumnNames) {
      const columnIndex = headers.findIndex((header) =>
        header.toLowerCase().includes(descName)
      );

      if (columnIndex !== -1) {
        // Verify the column contains text descriptions
        if (this.columnContainsDescriptions(data, columnIndex)) {
          return columnIndex;
        }
      }
    }

    // If no match by name, look for columns with characteristics of descriptions
    const candidateColumns = [];

    for (let i = 0; i < headers.length; i++) {
      // Skip already identified date columns
      if (this.isLikelyDateColumn(data, i)) continue;

      // Skip columns that appear to contain numeric values
      if (this.isLikelyNumericColumn(data, i)) continue;

      // Score columns based on descriptive qualities
      const score = this.evaluateDescriptionColumn(data, i);
      if (score > 0) {
        candidateColumns.push({ index: i, score });
      }
    }

    // Sort by score descending and return highest
    if (candidateColumns.length > 0) {
      candidateColumns.sort((a, b) => b.score - a.score);
      return candidateColumns[0].index;
    }

    return undefined;
  }

  /**
   * Check if a column contains descriptive text values
   */
  private columnContainsDescriptions(
    data: any[],
    columnIndex: number
  ): boolean {
    // Sample the first [globalSampleSize] rows or all rows if less than [globalSampleSize]
    const sampleSize = Math.min(globalSampleSize, data.length);
    let textCount = 0;
    let avgLength = 0;

    for (let i = 0; i < sampleSize; i++) {
      const value = data[i][Object.keys(data[i])[columnIndex]];
      if (!value) continue;

      const strValue = String(value).trim();

      // Skip empty values
      if (!strValue) continue;

      // Check if it's a text description (not just numbers or short codes)
      if (strValue.length > 3 && !/^\d+$/.test(strValue)) {
        textCount++;
        avgLength += strValue.length;
      }
    }

    // Calculate average description length if we have text values
    if (textCount > 0) {
      avgLength = avgLength / textCount;
    }

    // Descriptions typically have a decent length and appear in most rows
    return textCount / sampleSize >= 0.7 && avgLength > globalSampleSize;
  }

  /**
   * Evaluate how likely a column is to contain transaction descriptions
   */
  private evaluateDescriptionColumn(data: any[], columnIndex: number): number {
    // Sample rows
    const sampleSize = Math.min(10, data.length);
    let score = 0;
    let wordCount = 0;
    let uniqueValues = new Set();

    for (let i = 0; i < sampleSize; i++) {
      const value = data[i][Object.keys(data[i])[columnIndex]];
      if (!value) continue;

      const strValue = String(value).trim();
      if (!strValue) continue;

      // Add to unique values set
      uniqueValues.add(strValue);

      // Count words in value
      const words = strValue.split(/\s+/).filter((word) => word.length > 0);
      wordCount += words.length;

      // Add points for characteristics of transaction descriptions

      // Length (descriptions are usually not too short or too long)
      if (strValue.length > 5 && strValue.length < 100) score += 1;

      // Contains multiple words (typical for descriptions)
      if (words.length > 1) score += 1;

      // Contains capital letters (names of merchants, etc.)
      if (/[A-Z]/.test(strValue)) score += 0.5;

      // Contains common transaction text patterns
      if (
        /purchase|payment|deposit|transfer|atm|check|payroll|direct|pos/i.test(
          strValue
        )
      ) {
        score += 2;
      }
    }

    // Bonus for high uniqueness (descriptions are usually different across transactions)
    const uniquenessRatio = uniqueValues.size / sampleSize;
    score += uniquenessRatio * 3;

    // Bonus for having a good average number of words
    const avgWords = wordCount / sampleSize;
    if (avgWords > 1.5 && avgWords < 10) {
      score += 2;
    }

    return score;
  }

  /**
   * Check if a column likely contains date values (to exclude from description candidates)
   */
  private isLikelyDateColumn(data: any[], columnIndex: number): boolean {
    // Reuse the date detection logic
    return this.columnsContainsDateValues(data, columnIndex);
  }

  /**
   * Check if a column likely contains enumeration values
   */
  private isLikelyEnumration(data: any[], columnIndex: number): boolean {
    // Sample the first [globalSampleSize] rows or all rows if less than [globalSampleSize]
    const sampleSize = Math.min(globalSampleSize, data.length);
    let chanceOfEnumaration = 0;
    let lastValue = 0;

    for (let i = 0; i < sampleSize; i++) {
      const value = data[i][Object.keys(data[i])[columnIndex]];
      if (!value) continue;
      // if (typeof value !== 'number') continue;
      const intValue = parseInt(value, 10);
      if (isNaN(intValue)) continue;

      if (intValue - lastValue === 1 || intValue + lastValue === 1) {
        chanceOfEnumaration += 1;
      } else {
        chanceOfEnumaration -= 1;
      }
      lastValue = value;
    }

    // If more than 60% of sample rows contain enumeration values, consider it an enumeration column
    return chanceOfEnumaration / sampleSize >= 0.6;
  }

  /**
   * Check if a column likely contains summary values
   */
  private isLikelySummaryColumn(data: any[], columnIndex: number): boolean {
    if (columnIndex !== 13) return false;
    console.log('---------------------------');
    // Sample the first [globalSampleSize] rows or all rows if less than [globalSampleSize]
    const sampleSize = Math.min(globalSampleSize, data.length);
    let chanceOfSummary = 0;
    let lastCurrentColumns = null;
    for (let rowIndex = 0; rowIndex < sampleSize; rowIndex++) {
      const row = data[rowIndex];
      const currentColumn = parseFloat(row[columnIndex]);
      if (isNaN(currentColumn)) continue;

      const othersColumns = row
        .filter((_, index) => index !== columnIndex && parseFloat(row[index]))
        .map((_) => parseFloat(_));

      console.log({ row, currentColumn, lastCurrentColumns, othersColumns });
      for (let i = 0; i < othersColumns.length; i++) {
        if (lastCurrentColumns !== null) {
          if (
            currentColumn - othersColumns[i] === lastCurrentColumns ||
            currentColumn + othersColumns[i] === lastCurrentColumns
          ) {
            chanceOfSummary++;
          }
        }
      }

      lastCurrentColumns = currentColumn;
      // if (!value) continue;
      // // if (typeof value !== 'number') continue;
      // const intValue = parseInt(value, 10);
      // if (isNaN(intValue)) continue;
      // intData[i].push(intValue);
    }
    // If more than 30% of sample rows contain enumeration values, consider it an enumeration column
    return chanceOfSummary / sampleSize >= 0.3;
  }

  /**
   * Check if a column likely contains numeric values (to exclude from description candidates)
   */
  private isLikelyNumericColumn(data: any[], columnIndex: number): boolean {
    // Sample the first [globalSampleSize] rows or all rows if less than [globalSampleSize]
    const sampleSize = Math.min(globalSampleSize, data.length);
    let numericCount = 0;

    for (let i = 0; i < sampleSize; i++) {
      const value = data[i][Object.keys(data[i])[columnIndex]];
      if (!value) continue;

      const strValue = String(value).trim();
      if (!strValue) continue;

      // Check if the value looks like a number (allowing for currency symbols)
      const numericPattern = /^[$€£¥]?[-+]?\d+(\.\d+)?%?$/;
      if (numericPattern.test(strValue.replace(/,/g, ''))) {
        numericCount++;
      }
    }

    // If more than 60% of sample rows contain numeric values, consider it a numeric column
    return numericCount / sampleSize >= 0.6;
  }

  /**
   * Find columns related to transaction amounts
   */
  private findAmountColumns(
    data: any[],
    headers: string[]
  ): {
    amountColumn?: number;
    incomeColumn?: number;
    expenseColumn?: number;
  } {
    // Common names for amount columns
    const amountColumnNames = [
      'amount',
      'transaction amount',
      'total',
      'sum',
      'value',
    ];

    // Common names for income/deposit columns
    const incomeColumnNames = [
      'deposit',
      'credit',
      'deposits',
      'credits',
      'income',
      'inflow',
      'deposit amount',
      'credit amount',
      'incoming',
      'received',
      'payments',
    ];

    // Common names for expense/withdrawal columns
    const expenseColumnNames = [
      'withdrawal',
      'debit',
      'withdrawals',
      'debits',
      'expense',
      'outflow',
      'withdrawal amount',
      'debit amount',
      'outgoing',
      'spent',
      'payment',
      'charge',
    ];

    // First, try to find separate income and expense columns by name
    let incomeColumn: number | undefined;
    let expenseColumn: number | undefined;

    // Check for income column
    for (const incomeName of incomeColumnNames) {
      const columnIndex = headers.findIndex((header) =>
        header.toLowerCase().includes(incomeName)
      );

      if (columnIndex !== -1 && this.isLikelyAmountColumn(data, columnIndex)) {
        incomeColumn = columnIndex;
        break;
      }
    }

    console.log('1', {
      incomeColumn,
      expenseColumn,
    });
    // Check for expense column
    for (const expenseName of expenseColumnNames) {
      const columnIndex = headers.findIndex((header) =>
        header.toLowerCase().includes(expenseName)
      );

      if (columnIndex !== -1 && this.isLikelyAmountColumn(data, columnIndex)) {
        expenseColumn = columnIndex;
        break;
      }
    }

    console.log('2', {
      incomeColumn,
      expenseColumn,
    });
    // If we found both income and expense columns, we're done
    if (incomeColumn !== undefined && expenseColumn !== undefined) {
      return { incomeColumn, expenseColumn };
    }

    console.log('3', {
      incomeColumn,
      expenseColumn,
    });
    // Next, try to find a single amount column
    let amountColumn: number | undefined;

    // First by name
    for (const amountName of amountColumnNames) {
      const columnIndex = headers.findIndex((header) =>
        header.toLowerCase().includes(amountName)
      );

      if (columnIndex !== -1 && this.isLikelyAmountColumn(data, columnIndex)) {
        amountColumn = columnIndex;
        break;
      }
    }
    console.log('4', {
      amountColumn,
      incomeColumn,
      expenseColumn,
    });
    // If not found by name, find the most likely amount column by content analysis
    if (amountColumn === undefined) {
      const candidateColumns = [];

      for (let i = 0; i < headers.length; i++) {
        console.log('------ testing column', i);
        // Skip date and description columns

        const isLikelyDateColumn = this.isLikelyDateColumn(data, i);
        console.log(i, 'isLikelyDateColumn', isLikelyDateColumn);
        if (isLikelyDateColumn) continue;

        const isDescritionColumn =
          this.findDescriptionColumn(data, headers) === 1;
        console.log(i, 'isDescritionColumn', isDescritionColumn);
        if (isDescritionColumn) continue;

        // Skip enumaration columns
        const isEnumeration = this.isLikelyEnumration(data, i);
        console.log(i, 'isEnumeration', isEnumeration);
        if (isEnumeration) continue;

        // Skip summary columns
        const isSummary = this.isLikelySummaryColumn(data, i);
        console.log(i, 'isSummary', isSummary);
        if (isSummary) continue;

        // Score this column as a potential amount column
        const score = this.evaluateAmountColumn(data, i);
        if (score > 0) {
          candidateColumns.push({ index: i, score });
        }
      }

      // Sort by score and pick the best one
      if (candidateColumns.length > 0) {
        candidateColumns.sort((a, b) => b.score - a.score);
        amountColumn = candidateColumns[0].index;
      }
      console.log('candidateColumns', candidateColumns);
    }

    console.log('5', {
      amountColumn,
      incomeColumn,
      expenseColumn,
    });
    // If we found a single amount column, check if it contains both positive and negative amounts
    // If so, it's a combined amount column rather than separate income/expense columns
    if (amountColumn !== undefined) {
      const hasPositiveAndNegative = this.hasPositiveAndNegativeValues(
        data,
        amountColumn
      );
      if (hasPositiveAndNegative) {
        return { amountColumn };
      }
    }

    console.log('6', {
      amountColumn,
      incomeColumn,
      expenseColumn,
    });
    // At this point, if we found only one of income/expense column,
    // try to find the complement using content analysis
    if (incomeColumn !== undefined && expenseColumn === undefined) {
      expenseColumn = this.findComplementaryAmountColumn(
        data,
        headers,
        incomeColumn
      );
    } else if (expenseColumn !== undefined && incomeColumn === undefined) {
      incomeColumn = this.findComplementaryAmountColumn(
        data,
        headers,
        expenseColumn
      );
    }

    console.log('7', {
      amountColumn,
      incomeColumn,
      expenseColumn,
    });
    // If we found separate income/expense columns, return those
    if (incomeColumn !== undefined || expenseColumn !== undefined) {
      return { incomeColumn, expenseColumn };
    }

    console.log('8', {
      amountColumn,
      incomeColumn,
      expenseColumn,
    });
    // If we didn't find anything, return the best amount column candidate if available
    if (amountColumn !== undefined) {
      return { amountColumn };
    }

    console.log('9', {
      amountColumn,
      incomeColumn,
      expenseColumn,
    });
    // If we still don't have anything, look for any column that might be numeric
    const numericColumns = headers
      .map((_, index) => {
        return { index, score: this.isLikelyAmountColumn(data, index) ? 1 : 0 };
      })
      .filter((col) => col.score > 0);

    console.log('10', {
      amountColumn,
      incomeColumn,
      expenseColumn,
    });
    if (numericColumns.length > 0) {
      return { amountColumn: numericColumns[0].index };
    }

    console.log('11', {
      amountColumn,
      incomeColumn,
      expenseColumn,
    });
    // If all else fails, return empty
    return {};
  }

  /**
   * Check if a column likely contains amount values
   */
  private isLikelyAmountColumn(data: any[], columnIndex: number): boolean {
    // Sample the first [globalSampleSize] rows or all rows if less than [globalSampleSize]
    const sampleSize = Math.min(globalSampleSize, data.length);
    let amountCount = 0;

    for (let i = 0; i < sampleSize; i++) {
      const value = data[i][Object.keys(data[i])[columnIndex]];
      if (!value) continue;

      const strValue = String(value).trim();
      if (!strValue) continue;

      // Remove currency symbols, commas, and spaces for parsing
      const parsableStr = strValue
        .replace(/[$€£¥]/g, '')
        .replace(/,/g, '')
        .replace(/\s/g, '');

      // Check if it's a valid number
      const num = parseFloat(parsableStr);
      if (!isNaN(num)) {
        amountCount++;
      }
    }

    // If more than 70% of sample rows contain amount values, consider it an amount column
    return amountCount / sampleSize >= 0.7;
  }

  /**
   * Evaluate how likely a column is to contain transaction amounts
   */
  private evaluateAmountColumn(data: any[], columnIndex: number): number {
    // TODO check si row = last row same as previous row
    // TODO check si row = last row + or - an other number field

    // Sample rows
    const sampleSize = Math.min(10, data.length);
    let score = 0;

    // Check for monetary indicators in the header
    const header = Object.keys(data[0])[columnIndex].toLowerCase();
    if (
      /amount|total|sum|balance|debit|credit|payment|deposit|withdrawal|money|cash|value/i.test(
        header
      )
    ) {
      score += 3;
    }

    // Check for currency symbol in the header
    if (/[$€£¥]/g.test(header)) {
      score += 2;
    }

    let currencySymbolCount = 0;
    let decimalCount = 0;
    let negativeCount = 0;
    let validNumberCount = 0;

    for (let i = 0; i < sampleSize; i++) {
      const value = data[i][Object.keys(data[i])[columnIndex]];
      if (!value) continue;

      const strValue = String(value).trim();
      if (!strValue) continue;

      // Check for currency symbols
      if (/[$€£¥]/g.test(strValue)) {
        currencySymbolCount++;
      }

      // Check for decimal points (common in monetary values)
      if (/\d+\.\d{2}/.test(strValue)) {
        decimalCount++;
      }

      // Check for negative values (expenses)
      if (/^-|^\(.*\)$/.test(strValue)) {
        negativeCount++;
      }

      // Check if it's a valid number after removing formatting
      const parsableStr = strValue
        .replace(/[$€£¥]/g, '')
        .replace(/,/g, '')
        .replace(/\s/g, '')
        .replace(/^\((.+)\)$/, '-$1'); // Convert (100.00) to -100.00

      const num = parseFloat(parsableStr);
      if (!isNaN(num)) {
        validNumberCount++;

        // Higher score for reasonable transaction amounts
        if (Math.abs(num) > 1 && Math.abs(num) < 10000) {
          score += 0.5;
        }
      }
    }

    // Add points for common monetary value indicators
    score += (currencySymbolCount / sampleSize) * 3;
    score += (decimalCount / sampleSize) * 2;
    score += (validNumberCount / sampleSize) * 2;

    // Bonus for having a mix of positive and negative values (common for transaction lists)
    if (negativeCount > 0 && negativeCount < sampleSize) {
      score += 2;
    }

    return score;
  }

  /**
   * Check if a column contains both positive and negative values
   */
  private hasPositiveAndNegativeValues(
    data: any[],
    columnIndex: number
  ): boolean {
    let hasPositive = false;
    let hasNegative = false;

    // Sample a significant number of rows
    const sampleSize = Math.min(20, data.length);

    for (let i = 0; i < sampleSize; i++) {
      const value = data[i][Object.keys(data[i])[columnIndex]];
      if (!value) continue;

      const strValue = String(value).trim();
      if (!strValue) continue;

      // Parse the value, handling various formats
      const parsableStr = strValue
        .replace(/[$€£¥]/g, '')
        .replace(/,/g, '')
        .replace(/\s/g, '')
        .replace(/^\((.+)\)$/, '-$1'); // Convert (100.00) to -100.00

      const num = parseFloat(parsableStr);
      if (!isNaN(num)) {
        if (num > 0) hasPositive = true;
        if (num < 0) hasNegative = true;

        // If we've found both positive and negative, we can exit early
        if (hasPositive && hasNegative) return true;
      }
    }

    return hasPositive && hasNegative;
  }

  /**
   * Find a complementary amount column
   * (if we already found one of income/expense, look for the other)
   */
  private findComplementaryAmountColumn(
    data: any[],
    headers: string[],
    knownColumn: number
  ): number | undefined {
    const candidateColumns = [];

    for (let i = 0; i < headers.length; i++) {
      // Skip already identified columns
      if (
        i === knownColumn ||
        i === this.findDateColumn(data, headers) ||
        i === this.findDescriptionColumn(data, headers)
      ) {
        continue;
      }

      // Only consider amount-like columns
      if (this.isLikelyAmountColumn(data, i)) {
        const score = this.evaluateAmountColumn(data, i);
        candidateColumns.push({ index: i, score });
      }
    }

    // Sort by score and return the best candidate
    if (candidateColumns.length > 0) {
      candidateColumns.sort((a, b) => b.score - a.score);
      return candidateColumns[0].index;
    }

    return undefined;
  }

  /**
   * Find column that indicates transaction type (if not using separate amount columns)
   */
  private findTypeColumn(data: any[], headers: string[]): number | undefined {
    // Common names for type columns
    const typeColumnNames = [
      'type',
      'transaction type',
      'trans type',
      'tran type',
      'category',
      'transaction category',
      'direction',
      'flow',
      'dc',
      'd/c',
      'debit/credit',
      'entry type',
      'kind',
    ];

    // Common type indicator values
    const incomeIndicators = [
      'credit',
      'deposit',
      'income',
      'incoming',
      'in',
      'received',
      'cr',
      'c',
      '+',
    ];
    const expenseIndicators = [
      'debit',
      'withdrawal',
      'expense',
      'outgoing',
      'out',
      'payment',
      'dr',
      'd',
      '-',
    ];

    // First try to match by common column names
    for (const typeName of typeColumnNames) {
      const columnIndex = headers.findIndex((header) =>
        header.toLowerCase().includes(typeName)
      );

      if (columnIndex !== -1) {
        // Verify it contains type indicators
        if (this.columnContainsTypeIndicators(data, columnIndex)) {
          return columnIndex;
        }
      }
    }

    // If no match by name, look for columns with type indicator values
    const candidateColumns = [];

    for (let i = 0; i < headers.length; i++) {
      // Skip columns already identified for other purposes
      if (
        i === this.findDateColumn(data, headers) ||
        i === this.findDescriptionColumn(data, headers)
      ) {
        continue;
      }

      // Skip columns that contain numbers (likely amount columns)
      if (this.isLikelyAmountColumn(data, i)) continue;

      // Score columns based on type indicator content
      const score = this.evaluateTypeColumn(data, i);
      if (score > 0) {
        candidateColumns.push({ index: i, score });
      }
    }

    // Sort by score and return highest
    if (candidateColumns.length > 0) {
      candidateColumns.sort((a, b) => b.score - a.score);
      return candidateColumns[0].index;
    }

    return undefined;
  }

  /**
   * Check if a column contains type indicator values
   */
  private columnContainsTypeIndicators(
    data: any[],
    columnIndex: number
  ): boolean {
    // Sample the first 10 rows or all rows if less than 10
    const sampleSize = Math.min(10, data.length);
    let indicatorCount = 0;

    // Common type indicator values (case insensitive)
    const typeIndicators = [
      /credit/i,
      /debit/i,
      /deposit/i,
      /withdrawal/i,
      /income/i,
      /expense/i,
      /payment/i,
      /transfer/i,
      /in/i,
      /out/i,
      /cr\.?/i,
      /dr\.?/i,
      /^c$/i,
      /^d$/i,
      /inflow/i,
      /outflow/i,
      /receive/i,
      /spend/i,
      /^pos$/i,
      /^atm$/i,
      /^ach$/i,
      /^check$/i,
    ];

    for (let i = 0; i < sampleSize; i++) {
      const value = data[i][Object.keys(data[i])[columnIndex]];
      if (!value) continue;

      const strValue = String(value).trim();
      if (!strValue) continue;

      // Check against type indicators
      for (const pattern of typeIndicators) {
        if (pattern.test(strValue)) {
          indicatorCount++;
          break;
        }
      }
    }

    // If more than 60% of sample rows contain type indicators, consider it a type column
    return indicatorCount / sampleSize >= 0.6;
  }

  /**
   * Evaluate how likely a column is to contain transaction type indicators
   */
  private evaluateTypeColumn(data: any[], columnIndex: number): number {
    // Sample rows
    const sampleSize = Math.min(globalSampleSize * 3, data.length);
    let score = 0;

    // Common type indicator values
    const incomeIndicators = [
      'credit',
      'deposit',
      'income',
      'incoming',
      'in',
      'received',
      'cr',
      'c',
      '+',
      'plus',
    ];
    const expenseIndicators = [
      'debit',
      'withdrawal',
      'expense',
      'outgoing',
      'out',
      'payment',
      'dr',
      'd',
      '-',
      'minus',
    ];

    // Check if header contains type-related terms
    const header = Object.keys(data[0])[columnIndex].toLowerCase();
    if (
      /type|category|direction|flow|debit|credit|dc|d\/c|transaction/i.test(
        header
      )
    ) {
      score += 2;
    }

    // Track unique values to check if there are just a few distinct values (likely a type column)
    const uniqueValues = new Set();
    let incomeIndicatorCount = 0;
    let expenseIndicatorCount = 0;

    for (let i = 0; i < sampleSize; i++) {
      const value = data[i][Object.keys(data[i])[columnIndex]];
      if (!value) continue;

      const strValue = String(value).trim().toLowerCase();
      if (!strValue) continue;

      // Add to unique values set
      uniqueValues.add(strValue);

      // Check for income indicators
      if (
        incomeIndicators.some(
          (indicator) => strValue === indicator || strValue.includes(indicator)
        )
      ) {
        incomeIndicatorCount++;
      }

      // Check for expense indicators
      if (
        expenseIndicators.some(
          (indicator) => strValue === indicator || strValue.includes(indicator)
        )
      ) {
        expenseIndicatorCount++;
      }
    }

    // Type columns typically have a small set of unique values
    const uniquenessRatio = uniqueValues.size / sampleSize;
    if (uniquenessRatio < 0.3) {
      score += 3;
    } else if (uniquenessRatio < 0.5) {
      score += 1;
    }

    // Higher score if we find both income and expense indicators
    if (incomeIndicatorCount > 0 && expenseIndicatorCount > 0) {
      score += 4;
    }

    // Add points for the presence of type indicators
    score += ((incomeIndicatorCount + expenseIndicatorCount) / sampleSize) * 3;

    // Bonus for short values (type indicators are usually short)
    const avgLength =
      Array.from(uniqueValues).reduce(
        (sum, val) => sum + String(val).length,
        0
      ) / uniqueValues.size;
    if (avgLength < 10) {
      score += 2;
    }

    return score;
  }

  /**
   * Calculate confidence level in the column mapping
   */
  calculateMappingConfidence(mapping: ColumnMapping): number {
    let confidence = 0;

    // Required fields check (date and either description or amount are essential)
    // Start with a base confidence of 0 and add points for each successful mapping

    // Date column is critical - without it, confidence is very low
    if (mapping.date !== undefined) {
      confidence += 0.3; // Date is worth 30% of confidence
    } else {
      // If no date column, max confidence will be very low
      return 0.1;
    }

    // Description column is important
    if (mapping.description !== undefined) {
      confidence += 0.2; // Description is worth 20% of confidence
    }

    // Amount information is critical - either a single amount or income/expense columns
    if (mapping.amount !== undefined) {
      confidence += 0.4; // Single amount column is worth 40% of confidence

      // Bonus if we also have a type column to distinguish income/expense
      if (mapping.type !== undefined) {
        confidence += 0.1;
      }
    } else if (
      mapping.incomeAmount !== undefined ||
      mapping.expenseAmount !== undefined
    ) {
      // Partial amount information
      confidence += 0.2; // One of income/expense is worth 20%

      // Both income and expense columns is ideal
      if (
        mapping.incomeAmount !== undefined &&
        mapping.expenseAmount !== undefined
      ) {
        confidence += 0.2; // Both columns add another 20%
      }
    } else {
      // No amount information severely limits usefulness
      return Math.min(0.3, confidence); // Cap at 30% if no amount data
    }

    // Check for overlapping columns (would indicate a problem with detection)
    const columns = [
      mapping.date,
      mapping.description,
      mapping.amount,
      mapping.incomeAmount,
      mapping.expenseAmount,
      mapping.type,
    ].filter((col) => col !== undefined);

    const uniqueColumns = new Set(columns);
    if (uniqueColumns.size < columns.length) {
      // Duplicate column assignments - reduce confidence
      confidence *= 0.5;
    }

    // Additional verification: amount and income/expense columns should not coexist
    if (
      mapping.amount !== undefined &&
      (mapping.incomeAmount !== undefined ||
        mapping.expenseAmount !== undefined)
    ) {
      // This is a logical inconsistency - reduce confidence
      confidence *= 0.7;
    }

    // Simple validation to ensure we don't exceed 1.0
    return Math.min(1.0, confidence);
  }

  /**
   * Map the CSV data to the application's transaction format
   */
  mapDataToTransactions(data: any[], mapping: ColumnMapping): RawTransaction[] {
    const rawTransactions: RawTransaction[] = [];

    // If we don't have the minimum required fields, return empty array
    if (
      mapping.date === undefined ||
      (mapping.amount === undefined &&
        mapping.incomeAmount === undefined &&
        mapping.expenseAmount === undefined)
    ) {
      return rawTransactions;
    }

    // Process each row in the CSV data
    for (const row of data) {
      try {
        const headers = Object.keys(row);

        // Get date value
        const dateValue = row[headers[mapping.date]];
        if (!dateValue) continue; // Skip rows without date

        // Format date consistently as ISO string (YYYY-MM-DD)
        const formattedDate = this.formatDateValue(dateValue);
        if (!formattedDate) continue; // Skip if date can't be parsed

        // Get description (if available)
        let description = '';
        if (mapping.description !== undefined) {
          description = String(row[headers[mapping.description]] || '').trim();
        }

        // Determine transaction amount and type
        let amount = 0;
        let type: 'income' | 'expense' = 'expense'; // Default to expense

        // Case 1: Single amount column
        if (mapping.amount !== undefined) {
          const amountStr = String(row[headers[mapping.amount]] || '0').trim();
          amount = this.parseAmountValue(amountStr);

          // Determine type based on amount sign or type column
          if (mapping.type !== undefined) {
            // Use type column
            const typeValue = String(row[headers[mapping.type]] || '')
              .trim()
              .toLowerCase();
            type = this.determineTransactionType(typeValue, amount);
          } else {
            // Use amount sign
            type = amount >= 0 ? 'income' : 'expense';
            // Make amount positive for expense transactions
            amount = Math.abs(amount);
          }
        }

        // Case 2: Separate income and expense columns
        else {
          if (mapping.incomeAmount !== undefined) {
            const incomeStr = String(
              row[headers[mapping.incomeAmount]] || '0'
            ).trim();
            const incomeAmount = this.parseAmountValue(incomeStr);

            if (incomeAmount > 0) {
              amount = incomeAmount;
              type = 'income';
            }
          }

          if (mapping.expenseAmount !== undefined && amount === 0) {
            const expenseStr = String(
              row[headers[mapping.expenseAmount]] || '0'
            ).trim();
            const expenseAmount = this.parseAmountValue(expenseStr);

            if (expenseAmount > 0) {
              amount = expenseAmount;
              type = 'expense';
            }
          }
        }

        // Only add transactions with non-zero amounts
        if (amount !== 0) {
          rawTransactions.push({
            date: formattedDate,
            description,
            amount,
          });
        }
      } catch (error) {
        console.error('Error mapping transaction row:', error);
        // Continue processing other rows
      }
    }

    return rawTransactions;
  }

  /**
   * Format a date value consistently as YYYY-MM-DD
   */
  private formatDateValue(dateValue: any): string | null {
    try {
      const strValue = String(dateValue).trim();

      // Try to create a Date object
      const dateObj = new Date(strValue);

      // Check if the date is valid
      if (!isNaN(dateObj.getTime())) {
        // Format as YYYY-MM-DD
        return dateObj.toISOString().split('T')[0];
      }

      // If direct parsing fails, try common formats
      // MM/DD/YYYY or DD/MM/YYYY
      const dateMatch = strValue.match(
        /^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/
      );
      if (dateMatch) {
        // Assume MM/DD/YYYY for US data (most common format in banking)
        const [_, part1, part2, yearPart] = dateMatch;

        // Convert 2-digit year to 4-digit
        let year = parseInt(yearPart);
        if (year < 100) {
          year += year < 50 ? 2000 : 1900;
        }

        // Try both MM/DD and DD/MM interpretations
        const month = parseInt(part1);
        const day = parseInt(part2);

        if (month <= 12) {
          const date = new Date(year, month - 1, day);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        }

        // Try the other interpretation (DD/MM)
        if (day <= 12) {
          const date = new Date(year, day - 1, month);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error formatting date:', error);
      return null;
    }
  }

  /**
   * Parse an amount value accounting for different formats
   */
  private parseAmountValue(amountStr: string): number {
    try {
      // Handle empty or non-string values
      if (!amountStr) return 0;

      // Clean the string: remove currency symbols, spaces, and convert parentheses to negative
      let cleanedStr = amountStr
        .replace(/[$€£¥]/g, '')
        .replace(/,/g, '')
        .replace(/\s/g, '')
        .trim();

      // Handle negative formats: (100.00) → -100.00
      if (/^\((.+)\)$/.test(cleanedStr)) {
        cleanedStr = '-' + cleanedStr.replace(/[()]/g, '');
      }

      // Convert to number
      const amount = parseFloat(cleanedStr);
      return isNaN(amount) ? 0 : amount;
    } catch (error) {
      console.error('Error parsing amount:', error);
      return 0;
    }
  }

  /**
   * Determine transaction type based on type indicator and amount
   */
  private determineTransactionType(
    typeValue: string,
    amount: number
  ): 'income' | 'expense' {
    // Common income indicators
    const incomeIndicators = [
      'credit',
      'deposit',
      'income',
      'incoming',
      'in',
      'received',
      'cr',
      'c',
      '+',
      'plus',
      'refund',
      'return',
    ];

    // Common expense indicators
    const expenseIndicators = [
      'debit',
      'withdrawal',
      'expense',
      'outgoing',
      'out',
      'payment',
      'dr',
      'd',
      '-',
      'minus',
      'purchase',
      'fee',
      'charge',
    ];

    // Check against income indicators
    if (
      incomeIndicators.some(
        (indicator) => typeValue.includes(indicator) || typeValue === indicator
      )
    ) {
      return 'income';
    }

    // Check against expense indicators
    if (
      expenseIndicators.some(
        (indicator) => typeValue.includes(indicator) || typeValue === indicator
      )
    ) {
      return 'expense';
    }

    // If type can't be determined from type column, use amount sign as fallback
    return amount >= 0 ? 'income' : 'expense';
  }

  /**
   * Process CSV with a known mapping (from cache)
   */
  processCsvWithMapping(
    csvContent: string,
    mapping: ColumnMapping
  ): CsvProcessResult {
    const { data } = parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    const transactions = this.mapDataToTransactions(data, mapping);

    return {
      success: true,
      transactions,
      confidence: this.calculateMappingConfidence(mapping),
    };
  }
}

export const csvMapper = new CsvMapper();
export default CsvMapper;

import { CSVRow } from '../types/csv';

export function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Handle escaped quotes
        field += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      fields.push(field.trim());
      field = '';
    } else {
      field += char;
    }
  }

  // Add the last field
  fields.push(field.trim());
  return fields;
}

export function readCSVFile(
  content: string | File
): Promise<{ headers: string[]; rows: string[][]; hasHeaders: boolean }> {
  return new Promise((resolve, reject) => {
    // If content is already a string, process it directly
    if (typeof content === 'string') {
      try {
        processCSVContent(content, resolve, reject);
        return;
      } catch (error) {
        reject(new Error('Error parsing CSV content'));
        return;
      }
    }

    // Otherwise, read the file
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const decoder = new TextDecoder('utf-8', { fatal: true });

        try {
          // Try to decode as UTF-8 first
          const text = decoder.decode(buffer);
          processCSVContent(text, resolve, reject);
        } catch (encodingError) {
          // If UTF-8 fails, try ISO-8859-1 (Latin-1)
          const latin1Decoder = new TextDecoder('iso-8859-1');
          const text = latin1Decoder.decode(buffer);
          processCSVContent(text, resolve, reject);
        }
      } catch (error) {
        reject(new Error('Error parsing CSV file'));
      }
    };

    reader.onerror = () => reject(new Error('Error reading file'));

    // Read the file as an array buffer to detect encoding
    reader.readAsArrayBuffer(content);
  });
}

function processCSVContent(
  text: string,
  resolve: (value: {
    headers: string[];
    rows: string[][];
    hasHeaders: boolean;
  }) => void,
  reject: (reason?: any) => void
) {
  try {
    // Handle different line endings (CRLF, LF)
    const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim());

    if (lines.length < 1) {
      reject(new Error('CSV file is empty'));
      return;
    }

    const firstRow = parseCSVLine(lines[0]);

    // Determine if the file has headers by checking the following:
    // 1. Are there at least 2 rows to compare?
    // 2. Do the first row cells have string-like content while second row has numeric content?
    // 3. Are the first row cells potentially column names (no numbers, short text)?
    let hasHeaders = false;

    if (lines.length >= 2) {
      const secondRow = parseCSVLine(lines[1]);

      // Check if the number of columns is consistent
      if (firstRow.length === secondRow.length) {
        // TODO Find better way to do this, don't work

        // Check if first row looks like headers
        const firstRowLooksLikeHeaders = firstRow.some((cell) => {
          // Headers often contain text, not just numbers
          const isNotJustNumber = isNaN(Number(cell)) || cell.trim() === '';
          // Headers are usually shorter than typical content
          const isReasonableLength = cell.length > 0 && cell.length < 50;
          // Headers often have capitalized words or underscores
          const hasHeaderFormat = /^[A-Za-z0-9_\s]+$/.test(cell);

          return isNotJustNumber && isReasonableLength && hasHeaderFormat;
        });

        // Check if second row has some numeric values
        const secondRowHasNumericValues = secondRow.some(
          (cell) => !isNaN(Number(cell)) && cell.trim() !== ''
        );

        hasHeaders = firstRowLooksLikeHeaders && secondRowHasNumericValues;
      }
    }

    const headers = hasHeaders
      ? firstRow
      : firstRow.map((_, index) => `Column ${index + 1}`);
    const rows = hasHeaders
      ? lines.slice(1).map((line) => parseCSVLine(line))
      : lines.map((line) => parseCSVLine(line));
    resolve({ headers, rows, hasHeaders });
  } catch (error) {
    reject(new Error('Error parsing CSV content'));
  }
}

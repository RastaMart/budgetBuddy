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
): Promise<{ headers: string[]; rows: string[][] }> {
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
  resolve: (value: { headers: string[]; rows: string[][] }) => void,
  reject: (reason?: any) => void
) {
  try {
    // Handle different line endings (CRLF, LF)
    const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim());

    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1).map((line) => parseCSVLine(line));

    resolve({ headers, rows });
  } catch (error) {
    reject(new Error('Error parsing CSV content'));
  }
}

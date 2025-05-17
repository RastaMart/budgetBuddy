import { supabase } from '../lib/supabase';
import sha256 from 'crypto-js/sha256';
import Hex from 'crypto-js/enc-hex';
import WordArray from 'crypto-js/lib-typedarrays';

export interface UploadedDocument {
  id: string;
  file_name: string;
  file_path: string;
  metadata: Record<string, any>;
}

export async function uploadCSVFile(
  file: File,
  userId: string
): Promise<UploadedDocument | null> {
  try {
    // Calculate file hash
    const buffer = await file.arrayBuffer();
    const wordArray = WordArray.create(new Uint8Array(buffer));
    const hash = sha256(wordArray).toString(Hex);

    // Check if file already exists - using limit(1) instead of single()
    const { data: existingDocs } = await supabase
      .from('user_documents')
      .select('*')
      .eq('user_id', userId)
      .eq('file_hash', hash)
      .limit(1);

    // If we found an existing document, return it
    if (existingDocs && existingDocs.length > 0) {
      return existingDocs[0];
    }

    // Skip bucket creation as it requires admin privileges
    // Regular users can't create buckets due to RLS policies
    // The bucket should be created by an admin beforehand

    // Upload file to storage
    const filePath = `${userId}/${hash}-${file.name}`;
    try {
      const { error: uploadError } = await supabase.storage
        .from('csv-uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('File upload error details:', {
          message: uploadError.message,
          status: uploadError.status,
          details: uploadError.details,
          hint: uploadError.hint,
          code: uploadError.code,
        });

        // If the error indicates the bucket doesn't exist, that's a server configuration issue
        if (
          uploadError.message.includes('bucket') &&
          uploadError.message.includes('not found')
        ) {
          console.error(
            'The csv-uploads bucket does not exist. An admin needs to create it.'
          );
        }
        throw uploadError;
      }
    } catch (storageError) {
      console.error('Storage operation failed:', storageError);
      throw storageError;
    }

    // Create document record
    try {
      const { data: document, error: docError } = await supabase
        .from('user_documents')
        .insert({
          user_id: userId,
          file_name: file.name,
          file_hash: hash,
          file_path: filePath,
          metadata: {
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
          },
        })
        .select()
        .single();

      if (docError) {
        console.error('Document creation error details:', {
          message: docError.message,
          details: docError.details,
          hint: docError.hint,
          code: docError.code,
        });
        throw docError;
      }
      return document;
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error uploading file - complete error object:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return null;
  }
}

export async function getFileContent(filePath: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('csv-uploads')
      .download(filePath);

    if (error) throw error;

    // First try to handle the file as a binary blob
    return await handleFileEncoding(data);
  } catch (error) {
    console.error('Error downloading file:', error);
    return null;
  }
}

// Function to handle various encodings, with special support for French accents
async function handleFileEncoding(blob: Blob): Promise<string> {
  // Read the file as ArrayBuffer to detect encoding
  const buffer = await blob.arrayBuffer();

  // Try multiple encodings that support French accents
  const encodingsToTry = [
    'utf-8', // Standard UTF-8
    'iso-8859-1', // Latin-1, common for French
    'iso-8859-15', // Latin-9, better Euro support and French chars
    'windows-1252', // Windows encoding common for Western European
  ];

  // Try each encoding until one works properly
  for (const encoding of encodingsToTry) {
    try {
      const decoder = new TextDecoder(encoding);
      const text = decoder.decode(buffer);

      // If text contains French characters and they look correct, return it
      if (text.match(/[àáâäæãåāéèêëêìíîïîòóôöõøùúûüñç]/i)) {
        console.log(`Successfully decoded with ${encoding}`);
        return text;
      }
    } catch (e) {
      console.log(`Failed to decode with ${encoding}:`, e);
      // Continue to next encoding
    }
  }

  // Fallback to windows-1252 as it's most likely to decode without errors
  const fallbackDecoder = new TextDecoder('windows-1252', { fatal: false });
  return fallbackDecoder.decode(buffer);
}

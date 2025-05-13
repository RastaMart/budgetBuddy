import { supabase } from '../lib/supabase';
import { createHash } from 'crypto-js/sha256';

export interface UploadedDocument {
  id: string;
  file_name: string;
  file_path: string;
  metadata: Record<string, any>;
}

export async function uploadCSVFile(file: File, userId: string): Promise<UploadedDocument | null> {
  try {
    // Calculate file hash
    const buffer = await file.arrayBuffer();
    const hash = createHash(new Uint8Array(buffer)).toString();

    // Check if file already exists
    const { data: existingDoc } = await supabase
      .from('user_documents')
      .select('*')
      .eq('user_id', userId)
      .eq('file_hash', hash)
      .single();

    if (existingDoc) {
      return existingDoc;
    }

    // Upload file to storage
    const filePath = `${userId}/${hash}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('csv-uploads')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Create document record
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
          lastModified: file.lastModified
        }
      })
      .select()
      .single();

    if (docError) throw docError;
    return document;
  } catch (error) {
    console.error('Error uploading file:', error);
    return null;
  }
}

export async function getFileContent(filePath: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('csv-uploads')
      .download(filePath);

    if (error) throw error;
    return await data.text();
  } catch (error) {
    console.error('Error downloading file:', error);
    return null;
  }
}
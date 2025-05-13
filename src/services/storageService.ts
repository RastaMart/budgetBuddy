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

export async function uploadCSVFile(file: File, userId: string): Promise<UploadedDocument | null> {
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

    // Create storage bucket if it doesn't exist
    const { data: buckets } = await supabase
      .storage
      .listBuckets();
    
    const csvBucketExists = buckets?.some(bucket => bucket.name === 'csv-uploads');
    
    if (!csvBucketExists) {
      const { error: bucketError } = await supabase
        .storage
        .createBucket('csv-uploads', {
          public: false,
          fileSizeLimit: 52428800, // 50MB
          allowedMimeTypes: ['text/csv', 'application/vnd.ms-excel']
        });

      if (bucketError) throw bucketError;
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
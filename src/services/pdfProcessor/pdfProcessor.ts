import { supabase } from '../../lib/supabase';
import { WordArray } from 'crypto-js';
import { sha256 } from 'crypto-js';
import { Hex } from 'crypto-js/enc-hex';

export class PdfProcessor {
  private userId: string | null = null;

  init(userId: string) {
    this.userId = userId;
    return this;
  }

  async uploadFile(file: File): Promise<string | null> {
    try {
      if (!this.userId) {
        throw new Error('User ID is required');
      }

      // Calculate file hash to check for duplicates
      const buffer = await file.arrayBuffer();
      const wordArray = WordArray.create(new Uint8Array(buffer));
      const hash = sha256(wordArray).toString(Hex);

      // Check if file already exists
      const { data: existingDocs } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', this.userId)
        .eq('file_hash', hash)
        .limit(1);

      // If we found an existing document, return its path
      if (existingDocs && existingDocs.length > 0) {
        return existingDocs[0].file_path;
      }

      // Upload file to storage
      const filePath = `${this.userId}/${hash}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('pdf-uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('PDF upload error:', uploadError);
        throw uploadError;
      }

      // Create document record
      const { data: document, error: docError } = await supabase
        .from('user_documents')
        .insert({
          user_id: this.userId,
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
        console.error('Document record creation error:', docError);
        throw docError;
      }

      return document.file_path;
    } catch (error) {
      console.error('Error uploading PDF file:', error);
      return null;
    }
  }

  async processPDF(filePath: string) {
    try {
      // Download the PDF from storage
      const { data, error } = await supabase.storage
        .from('pdf-uploads')
        .download(filePath);

      if (error) {
        throw error;
      }

      // Here you would process the PDF content
      // This is a placeholder that would be replaced with actual PDF processing
      return {
        success: true,
        data: {
          text: 'Extracted text would appear here',
          tables: [],
        },
      };
    } catch (error) {
      console.error('Error processing PDF:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error processing PDF',
      };
    }
  }
}
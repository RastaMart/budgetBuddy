import { supabase } from '../lib/supabase';
import { createHash } from 'crypto-js/sha256';

export async function processDocument(file: File, userId: string) {
  try {
    // Read file content
    const fileContent = await file.text();
    const fileName = file.name;
    const fileType = file.type;

    // Call edge function to process document
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-document`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          fileContent,
          fileName,
          fileType,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || 
        `Server responded with status ${response.status}`
      );
    }

    const result = await response.json();
    
    if (!result.documentId) {
      throw new Error('Invalid response: missing documentId');
    }

    return result;
  } catch (error) {
    console.error('Error processing document:', error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Failed to process document'
    );
  }
}

export async function findSimilarDocuments(content: string, userId: string) {
  try {
    // Get embedding for search content
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-embedding`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || 
        `Server responded with status ${response.status}`
      );
    }

    const { embedding } = await response.json();

    if (!embedding) {
      throw new Error('Invalid response: missing embedding');
    }

    // Search for similar documents
    const { data: similarDocuments, error } = await supabase.rpc(
      'match_documents',
      {
        query_embedding: embedding,
        match_threshold: 0.8,
        match_count: 5,
        user_id: userId,
      }
    );

    if (error) throw error;
    return similarDocuments;
  } catch (error) {
    console.error('Error finding similar documents:', error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Failed to find similar documents'
    );
  }
}
import { supabase } from '../lib/supabase';

export async function processDocument(file: File, userId: string) {
  try {
    // Generate file hash
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Convert file to base64
    const fileData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Call the edge function
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-document`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          fileData,
          fileName: file.name,
          fileHash
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to process document');
    }

    const result = await response.json();
    console.log('Document processed successfully:', result);
    
    if (result.webhookResponse) {
      console.log('Webhook response:', result.webhookResponse);
    }

    return result;
  } catch (error) {
    console.error('Error processing document:', error);
    throw error;
  }
}
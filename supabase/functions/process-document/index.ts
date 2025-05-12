import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import { Configuration, OpenAIApi } from "npm:openai@4.28.0";
import { createHash } from "npm:crypto@1.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const openai = new OpenAIApi(
      new Configuration({
        apiKey: openaiKey,
      })
    );

    // Validate request body
    if (!req.body) {
      throw new Error('Request body is required');
    }

    const { userId, fileContent, fileName, fileType } = await req.json();

    if (!userId || !fileContent || !fileName || !fileType) {
      throw new Error('Missing required fields in request body');
    }

    // Generate file hash for deduplication
    const hash = createHash('sha256')
      .update(fileContent)
      .digest('hex');

    // Check for existing document
    const { data: existingDoc, error: existingDocError } = await supabaseClient
      .from('user_documents')
      .select('id')
      .eq('user_id', userId)
      .eq('file_hash', hash)
      .single();

    if (existingDocError && existingDocError.code !== 'PGRST116') {
      throw existingDocError;
    }

    if (existingDoc) {
      return new Response(
        JSON.stringify({ 
          documentId: existingDoc.id,
          status: 'existing'
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Store file in Supabase Storage
    const filePath = `documents/${userId}/${hash}/${fileName}`;
    const { error: uploadError } = await supabaseClient
      .storage
      .from('documents')
      .upload(filePath, Buffer.from(fileContent));

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error('Failed to upload file to storage');
    }

    // Create document record
    const { data: document, error: documentError } = await supabaseClient
      .from('user_documents')
      .insert({
        user_id: userId,
        file_name: fileName,
        file_hash: hash,
        file_path: filePath,
        metadata: {
          fileType,
          size: fileContent.length,
        }
      })
      .select()
      .single();

    if (documentError) {
      console.error('Document creation error:', documentError);
      throw new Error('Failed to create document record');
    }

    if (!document) {
      throw new Error('Document record not created');
    }

    // Generate embeddings for content chunks
    const chunkSize = 1000; // Adjust based on token limits
    const chunks = [];
    for (let i = 0; i < fileContent.length; i += chunkSize) {
      chunks.push(fileContent.slice(i, i + chunkSize));
    }

    try {
      const embeddings = await Promise.all(
        chunks.map(async (chunk, index) => {
          try {
            const response = await openai.createEmbedding({
              model: "text-embedding-3-small",
              input: chunk,
            });

            if (!response.data?.data?.[0]?.embedding) {
              throw new Error('Invalid embedding response from OpenAI');
            }

            return {
              document_id: document.id,
              embedding: response.data.data[0].embedding,
              content: chunk,
              chunk_index: index,
            };
          } catch (error) {
            console.error(`Error generating embedding for chunk ${index}:`, error);
            throw new Error('Failed to generate embeddings');
          }
        })
      );

      // Store embeddings
      const { error: embeddingsError } = await supabaseClient
        .from('document_embeddings')
        .insert(embeddings);

      if (embeddingsError) {
        console.error('Embeddings storage error:', embeddingsError);
        throw new Error('Failed to store embeddings');
      }

    } catch (error) {
      console.error('Embeddings processing error:', error);
      // Even if embeddings fail, we still return success with the document
      console.warn('Continuing without embeddings due to error');
    }

    return new Response(
      JSON.stringify({ 
        documentId: document.id,
        status: 'success'
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Process document error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import { Configuration, OpenAIApi } from "npm:openai@4.28.0";
import { createHash } from "npm:crypto@1.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const openai = new OpenAIApi(
      new Configuration({
        apiKey: Deno.env.get("OPENAI_API_KEY"),
      })
    );

    const { userId, fileContent, fileName, fileType } = await req.json();

    // Generate file hash for deduplication
    const hash = createHash('sha256')
      .update(fileContent)
      .digest('hex');

    // Check for existing document
    const { data: existingDoc } = await supabaseClient
      .from('user_documents')
      .select('id')
      .eq('user_id', userId)
      .eq('file_hash', hash)
      .single();

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

    if (uploadError) throw uploadError;

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

    if (documentError) throw documentError;

    // Generate embeddings for content chunks
    const chunkSize = 1000; // Adjust based on token limits
    const chunks = [];
    for (let i = 0; i < fileContent.length; i += chunkSize) {
      chunks.push(fileContent.slice(i, i + chunkSize));
    }

    const embeddings = await Promise.all(
      chunks.map(async (chunk, index) => {
        const response = await openai.createEmbedding({
          model: "text-embedding-3-small",
          input: chunk,
        });

        return {
          document_id: document.id,
          embedding: response.data.data[0].embedding,
          content: chunk,
          chunk_index: index,
        };
      })
    );

    // Store embeddings
    const { error: embeddingsError } = await supabaseClient
      .from('document_embeddings')
      .insert(embeddings);

    if (embeddingsError) throw embeddingsError;

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
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
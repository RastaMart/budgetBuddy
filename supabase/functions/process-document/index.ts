import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id",
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

    // Get the file data from the request
    const { fileData, fileName, fileHash } = await req.json();

    // Check if document already exists for this user
    const { data: existingDoc, error: existingError } = await supabaseClient
      .from('user_documents')
      .select('id')
      .match({ 
        user_id: req.headers.get('x-user-id'),
        file_hash: fileHash 
      })
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      throw existingError;
    }

    if (existingDoc) {
      return new Response(
        JSON.stringify({ 
          message: 'Document already exists',
          documentId: existingDoc.id 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Store the document
    const { data: document, error: documentError } = await supabaseClient
      .from('user_documents')
      .insert({
        user_id: req.headers.get('x-user-id'),
        file_name: fileName,
        file_hash: fileHash,
        file_path: `documents/${fileHash}`,
        metadata: {
          originalName: fileName,
          processedAt: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (documentError) throw documentError;

    // Store the file in storage
    const { error: storageError } = await supabaseClient
      .storage
      .from('documents')
      .upload(`${fileHash}`, Buffer.from(fileData));

    if (storageError) throw storageError;

    return new Response(
      JSON.stringify({ 
        success: true,
        documentId: document.id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing document:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
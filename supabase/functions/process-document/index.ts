import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import { encode as base64Encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";
import { Configuration, OpenAIApi } from "npm:openai@4.28.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id",
  "Access-Control-Max-Age": "86400",
  "Access-Control-Allow-Credentials": "true"
};

const WEBHOOK_URL = Deno.env.get('WEBHOOK_URL') || "https://rastamart.app.n8n.cloud/webhook-test/processDocument";
const WEBHOOK_USERNAME = Deno.env.get('WEBHOOK_USERNAME') || "budgetbuddyStaging";
const WEBHOOK_PASSWORD = Deno.env.get('WEBHOOK_PASSWORD') || "qifMek-zuvfy2-hidpeb";

// Verify environment variables
const requiredEnvVars = {
  'OPENAI_API_KEY': Deno.env.get('OPENAI_API_KEY'),
  'SUPABASE_URL': Deno.env.get('SUPABASE_URL'),
  'SUPABASE_SERVICE_ROLE_KEY': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
};

Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    console.error(`Missing required environment variable: ${key}`);
  }
});

const openai = new OpenAIApi(new Configuration({
  apiKey: requiredEnvVars.OPENAI_API_KEY,
}));

async function generateEmbedding(text: string) {
  try {
    console.log('Generating embedding for text...');
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });
    console.log('Embedding generated successfully');
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

async function notifyWebhook(documentId: string, fileName: string) {
  try {
    console.log(`Notifying webhook for document ${documentId}`);
    const authHeader = `Basic ${base64Encode(`${WEBHOOK_USERNAME}:${WEBHOOK_PASSWORD}`)}`;
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        documentId,
        fileName,
        processedAt: new Date().toISOString()
      })
    });

    const responseText = await response.text();
    console.log('Webhook response:', response.status, responseText);

    return {
      status: response.status,
      body: responseText
    };
  } catch (error) {
    console.error('Error notifying webhook:', error);
    return {
      status: 500,
      body: `Failed to notify webhook: ${error.message}`
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    console.log('Creating Supabase client...');
    const supabaseClient = createClient(
      requiredEnvVars.SUPABASE_URL ?? '',
      requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the file data from the request
    const { fileData, fileName, fileHash, content } = await req.json();
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log('Checking for existing document...');
    // Check if document already exists for this user
    const { data: existingDoc, error: existingError } = await supabaseClient
      .from('user_documents')
      .select('id')
      .match({ 
        user_id: userId,
        file_hash: fileHash 
      })
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing document:', existingError);
      throw existingError;
    }

    if (existingDoc) {
      console.log('Document already exists:', existingDoc.id);
      // Notify webhook about existing document
      const webhookResponse = await notifyWebhook(existingDoc.id, fileName);

      return new Response(
        JSON.stringify({ 
          message: 'Document already exists',
          documentId: existingDoc.id,
          webhookResponse 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log('Storing document in user_documents...');
    // Store the document in user_documents
    const { data: userDocument, error: documentError } = await supabaseClient
      .from('user_documents')
      .insert({
        user_id: userId,
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

    if (documentError) {
      console.error('Error storing document:', documentError);
      throw documentError;
    }

    if (content) {
      console.log('Generating embedding for content...');
      // Generate embedding for the content
      const embedding = await generateEmbedding(content);

      console.log('Storing document with embedding...');
      // Store in documents table
      const { error: embeddingError } = await supabaseClient
        .from('documents')
        .insert({
          content: content,
          metadata: {
            user_id: userId,
            document_id: userDocument.id,
            file_name: fileName,
            created_at: new Date().toISOString()
          },
          embedding: embedding
        });

      if (embeddingError) {
        console.error('Error storing embedding:', embeddingError);
        throw embeddingError;
      }
    }

    console.log('Storing file in storage...');
    // Store the file in storage
    const { error: storageError } = await supabaseClient
      .storage
      .from('documents')
      .upload(`${fileHash}`, Buffer.from(fileData));

    if (storageError) {
      console.error('Error storing file:', storageError);
      throw storageError;
    }

    // Notify webhook about new document
    const webhookResponse = await notifyWebhook(userDocument.id, fileName);

    return new Response(
      JSON.stringify({ 
        success: true,
        documentId: userDocument.id,
        webhookResponse
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing document:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
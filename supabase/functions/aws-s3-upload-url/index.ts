// FILE: supabase/functions/aws-s3-upload-url/index.ts
// PURPOSE: Generate pre-signed S3 upload URL using YOUR configured secrets

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { S3Client, PutObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3';
import { getSignedUrl } from 'https://esm.sh/@aws-sdk/s3-request-presigner@3';

// Use YOUR configured secrets (already in Lovable)
const s3Client = new S3Client({
  region: Deno.env.get('AWS_REGION')!, // us-east-1
  credentials: {
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID')!,
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!
  }
});

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });
  }

  try {
    const { key, contentType, fileSize } = await req.json();

    console.log(`🔑 Generating pre-signed URL for: ${key}`);
    console.log(`📦 Bucket: ${Deno.env.get('S3_UPLOAD_BUCKET')}`);

    const command = new PutObjectCommand({
      Bucket: Deno.env.get('S3_UPLOAD_BUCKET'), // axessible-video-uploads
      Key: key,
      ContentType: contentType
    });

    // Generate pre-signed URL (valid for 1 hour)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    console.log('✅ Pre-signed URL generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        uploadUrl, 
        s3Key: key,
        bucket: Deno.env.get('S3_UPLOAD_BUCKET')
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );

  } catch (error) {
    console.error('❌ Error generating upload URL:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }
});

// FILE: supabase/functions/aws-s3-upload-url/index.ts
// FIXED: Using specific AWS SDK versions that work with Deno

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// ✅ FIXED: Use specific versions from deno.land/x
import { S3Client } from 'https://deno.land/x/s3_lite_client@0.7.0/mod.ts';

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

    // Initialize S3 client with credentials from environment
    const s3Client = new S3Client({
      endPoint: 's3.amazonaws.com',
      region: Deno.env.get('AWS_REGION')!,
      accessKey: Deno.env.get('AWS_ACCESS_KEY_ID')!,
      secretKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!,
      bucket: Deno.env.get('S3_UPLOAD_BUCKET')!,
    });

    // Generate pre-signed URL for PUT (upload)
    const uploadUrl = await s3Client.getPresignedUrl(
      'PUT',
      key,
      {
        expirySeconds: 3600, // 1 hour
        headers: {
          'Content-Type': contentType
        }
      }
    );

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

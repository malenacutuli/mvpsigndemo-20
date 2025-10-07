import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Constants
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100MB
const MIN_PART_SIZE = 10 * 1024 * 1024; // 10MB per part

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
  'video/x-msvideo',
  'video/avi',
];

// Validation function
function validateFile(filename: string, contentType: string, fileSize: number) {
  if (fileSize <= 0) {
    return { valid: false, error: 'File size must be greater than 0' };
  }

  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  if (!ALLOWED_VIDEO_TYPES.includes(contentType.toLowerCase())) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: MP4, WebM, QuickTime, Matroska`,
    };
  }

  if (!filename || filename.length > 255) {
    return { valid: false, error: 'Invalid filename' };
  }

  const useMultipart = fileSize >= MULTIPART_THRESHOLD;
  const partCount = useMultipart ? Math.ceil(fileSize / MIN_PART_SIZE) : undefined;

  return { valid: true, useMultipart, partCount };
}

// AWS Signature V4 helper functions
async function sha256(message: string): Promise<ArrayBuffer> {
  const msgBuffer = new TextEncoder().encode(message);
  return await crypto.subtle.digest('SHA-256', msgBuffer);
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const msgBuffer = new TextEncoder().encode(message);
  return await crypto.subtle.sign('HMAC', cryptoKey, msgBuffer);
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function getAmzDate(): string {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
}

// Generate presigned URL for direct upload
async function generatePresignedUrl(
  key: string,
  contentType: string,
  expiresIn: number = 600
): Promise<string> {
  const accessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID')!;
  const secretAccessKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY')!;
  const endpoint = Deno.env.get('CLOUDFLARE_R2_ENDPOINT')!;
  const bucketName = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME')!;

  const url = new URL(endpoint);
  const host = url.hostname;
  const region = 'auto';
  const service = 's3';
  
  const amzDate = getAmzDate();
  const dateStamp = amzDate.substring(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const canonicalUri = `/${bucketName}/${key}`;
  const canonicalQuerystring = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': 'host',
  }).toString();

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  const payloadHash = 'UNSIGNED-PAYLOAD';

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const canonicalRequestHash = toHex(await sha256(canonicalRequest));
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');

  const kDate = await hmacSha256(
    new TextEncoder().encode(`AWS4${secretAccessKey}`),
    dateStamp
  );
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');

  const signature = toHex(await hmacSha256(kSigning, stringToSign));

  const finalUrl = `${endpoint}${canonicalUri}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;
  
  return finalUrl;
}

// Initiate multipart upload
async function initiateMultipartUpload(key: string, contentType: string): Promise<string> {
  const accessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID')!;
  const secretAccessKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY')!;
  const endpoint = Deno.env.get('CLOUDFLARE_R2_ENDPOINT')!;
  const bucketName = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME')!;

  const url = new URL(endpoint);
  const host = url.hostname;
  const fullUrl = `${endpoint}/${bucketName}/${key}?uploads`;
  
  const amzDate = getAmzDate();
  const dateStamp = amzDate.substring(0, 8);
  const payloadHash = toHex(await sha256(''));

  const canonicalUri = `/${bucketName}/${key}`;
  const canonicalQuerystring = 'uploads=';
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [
    'POST',
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const canonicalRequestHash = toHex(await sha256(canonicalRequest));
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');

  const kDate = await hmacSha256(
    new TextEncoder().encode(`AWS4${secretAccessKey}`),
    dateStamp
  );
  const kRegion = await hmacSha256(kDate, 'auto');
  const kService = await hmacSha256(kRegion, 's3');
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = toHex(await hmacSha256(kSigning, stringToSign));

  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Host': host,
      'X-Amz-Date': amzDate,
      'X-Amz-Content-Sha256': payloadHash,
      'Authorization': `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to initiate multipart upload: ${error}`);
  }

  const xmlText = await response.text();
  const uploadIdMatch = xmlText.match(/<UploadId>([^<]+)<\/UploadId>/);
  
  if (!uploadIdMatch) {
    throw new Error('Failed to extract UploadId from response');
  }

  return uploadIdMatch[1];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { filename, contentType, fileSize } = await req.json();

    console.log('[UPLOAD-URL] Request:', { filename, contentType, fileSize });

    // Validate file
    const validation = validateFile(filename, contentType, fileSize);
    
    if (!validation.valid) {
      console.log('[UPLOAD-URL] Validation failed:', validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFilename = `videos/${user.id}/${timestamp}-${randomStr}-${sanitizedFilename}`;

    if (validation.useMultipart) {
      // MULTIPART UPLOAD for large files (100MB+)
      console.log(`[UPLOAD-URL] Using multipart for ${filename} (${fileSize} bytes)`);
      
      const uploadId = await initiateMultipartUpload(uniqueFilename, contentType);
      
      // Generate presigned URLs for each part
      const partUrls: string[] = [];
      const partCount = validation.partCount!;
      
      for (let partNumber = 1; partNumber <= partCount; partNumber++) {
        // For multipart, we'll generate URLs on-demand via get-r2-part-url function
        partUrls.push(`part-${partNumber}`);
      }

      console.log('[UPLOAD-URL] Multipart initiated:', { uploadId, partCount });

      return new Response(
        JSON.stringify({
          method: 'multipart',
          key: uniqueFilename,
          uploadId,
          partCount,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
      
    } else {
      // PRESIGNED URL for small files (<100MB)
      console.log(`[UPLOAD-URL] Using presigned URL for ${filename} (${fileSize} bytes)`);
      
      const uploadUrl = await generatePresignedUrl(
        uniqueFilename,
        contentType,
        600 // 10 minutes
      );

      console.log('[UPLOAD-URL] Presigned URL generated');

      return new Response(
        JSON.stringify({
          method: 'presigned',
          uploadUrl,
          key: uniqueFilename,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error) {
    console.error('[UPLOAD-URL] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

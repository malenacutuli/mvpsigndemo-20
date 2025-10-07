import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function createAwsSignature(method: string, url: string, accessKeyId: string, secretAccessKey: string, payload: string = '') {
  const encoder = new TextEncoder();
  const dateTime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = dateTime.substring(0, 8);
  const region = 'auto';
  const service = 's3';
  const urlObj = new URL(url);
  
  const payloadHash = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(payload)))
  ).map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Build raw path from the original URL to avoid automatic decoding issues
  const rawPath = url.substring(url.indexOf('/', url.indexOf('://') + 3)).split('?')[0];

  const canonicalRequest = [
    method,
    rawPath,
    urlObj.search.substring(1),
    `host:${urlObj.host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${dateTime}`,
    '',
    'host;x-amz-content-sha256;x-amz-date',
    payloadHash
  ].join('\n');
  
  const credentialScope = `${date}/${region}/${service}/aws4_request`;
  const canonicalHash = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest)))
  ).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const stringToSign = `AWS4-HMAC-SHA256\n${dateTime}\n${credentialScope}\n${canonicalHash}`;
  
  async function hmac(key: Uint8Array, data: string): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data)));
  }
  
  let key = encoder.encode('AWS4' + secretAccessKey);
  key = await hmac(key, date);
  key = await hmac(key, region);
  key = await hmac(key, service);
  key = await hmac(key, 'aws4_request');
  const signature = Array.from(await hmac(key, stringToSign)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return {
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`,
    'x-amz-date': dateTime,
    'x-amz-content-sha256': payloadHash
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');
    
    const { fileName, fileType } = await req.json();
    
    const endpoint = Deno.env.get('CLOUDFLARE_R2_ENDPOINT')!;
    const accessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID')!;
    const secretAccessKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY')!;
    const bucketName = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME')!;
    
    const key = `videos/${user.id}/${crypto.randomUUID()}-${fileName}`;
    const pathParts = key.split('/');
    const encodedPath = pathParts.slice(0, -1).join('/') + '/' + encodeURIComponent(pathParts[pathParts.length - 1]);
    const url = `${endpoint}/${bucketName}/${encodedPath}?uploads=`;
    
    const auth = await createAwsSignature('POST', url, accessKeyId, secretAccessKey, '');
    
    console.log('Initiating upload to:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': auth.authorization,
        'x-amz-date': auth['x-amz-date'],
        'x-amz-content-sha256': auth['x-amz-content-sha256'],
        'Content-Type': fileType
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('R2 initiate failed:', response.status, errorText);
      throw new Error(`Failed to initiate: ${response.status} ${errorText}`);
    }
    
    const xmlText = await response.text();
    console.log('R2 response XML:', xmlText);
    
    const uploadIdMatch = xmlText.match(/<UploadId>([^<]+)<\/UploadId>/);
    if (!uploadIdMatch) throw new Error('Failed to extract UploadId from XML response');
    
    const uploadId = uploadIdMatch[1];
    console.log('Upload initiated successfully. UploadId:', uploadId, 'Key:', key);
    
    return new Response(
      JSON.stringify({ uploadId, key, bucketName }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
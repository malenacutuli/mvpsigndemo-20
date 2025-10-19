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
  const payloadHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(payload)))).map(b => b.toString(16).padStart(2, '0')).join('');
  const canonicalRequest = [method, urlObj.pathname, urlObj.search.substring(1), `host:${urlObj.host}`, `x-amz-date:${dateTime}`, '', 'host;x-amz-date', payloadHash].join('\n');
  const credentialScope = `${date}/${region}/${service}/aws4_request`;
  const canonicalHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest)))).map(b => b.toString(16).padStart(2, '0')).join('');
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
  return { authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=host;x-amz-date, Signature=${signature}`, 'x-amz-date': dateTime };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: req.headers.get('Authorization')! } } });
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');
    const { key, uploadId, parts, fileName, fileSize } = await req.json();
    const endpoint = Deno.env.get('CLOUDFLARE_R2_ENDPOINT')!;
    const accessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID')!;
    const secretAccessKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY')!;
    const bucketName = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME')!;
    const partsXml = parts.map((p: { partNumber: number; etag: string }) => `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${p.etag}</ETag></Part>`).join('');
    const completeBody = `<CompleteMultipartUpload>${partsXml}</CompleteMultipartUpload>`;
    
    // Fix URL encoding - only encode filename, preserve path structure
    const pathParts = key.split('/');
    const fileName = pathParts.pop() || '';
    const path = pathParts.join('/');

    const encodedFileName = encodeURIComponent(fileName);
    const url = path 
      ? `${endpoint}/${bucketName}/${path}/${encodedFileName}?uploadId=${encodeURIComponent(uploadId)}`
      : `${endpoint}/${bucketName}/${encodedFileName}?uploadId=${encodeURIComponent(uploadId)}`;

    console.log('Complete multipart upload URL:', url);
    const auth = await createAwsSignature('POST', url, accessKeyId, secretAccessKey, completeBody);
    const response = await fetch(url, { method: 'POST', headers: { 'Authorization': auth.authorization, 'x-amz-date': auth['x-amz-date'], 'Content-Type': 'application/xml' }, body: completeBody });
    if (!response.ok) throw new Error(`Failed to complete: ${response.status} ${await response.text()}`);
    const publicUrl = `${endpoint}/${bucketName}/${key}`;
    return new Response(JSON.stringify({ success: true, url: publicUrl, key }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

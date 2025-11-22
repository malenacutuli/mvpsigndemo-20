import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function createAwsSignature(method: string, url: string, accessKeyId: string, secretAccessKey: string) {
  const encoder = new TextEncoder();
  const dateTime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = dateTime.substring(0, 8);
  const region = 'auto';
  const service = 's3';
  const urlObj = new URL(url);
  const payloadHash = 'UNSIGNED-PAYLOAD';
  // Build raw path from the original URL to avoid automatic decoding issues
  const rawPath = url.substring(url.indexOf('/', url.indexOf('://') + 3)).split('?')[0];
  const canonicalRequest = [method, rawPath, urlObj.search.substring(1), `host:${urlObj.host}`, `x-amz-content-sha256:${payloadHash}`, `x-amz-date:${dateTime}`, '', 'host;x-amz-content-sha256;x-amz-date', payloadHash].join('\n');
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
  return { authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`, 'x-amz-date': dateTime, 'x-amz-content-sha256': payloadHash };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: req.headers.get('Authorization')! } } });
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');
    
    const body = await req.json();
    console.log('Received body:', JSON.stringify(body));
    
    const { key, uploadId, partNumber } = body;
    
    if (!key || !uploadId || !partNumber) {
      console.error('Missing required fields:', { key, uploadId, partNumber });
      throw new Error('key, uploadId and partNumber are required');
    }
    
    const endpoint = Deno.env.get('CLOUDFLARE_R2_ENDPOINT')!;
    const accessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID')!;
    const secretAccessKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY')!;
    const bucketName = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME')!;
    
    // Encode only the filename (last part), keep path structure intact
    const pathParts = key.split('/');
    const fileName = pathParts.pop();
    const path = pathParts.join('/');
    const url = `${endpoint}/${bucketName}/${path}/${encodeURIComponent(fileName)}?partNumber=${partNumber}&uploadId=${encodeURIComponent(uploadId)}`;
    console.log('Generated URL:', url);
    
    const auth = await createAwsSignature('PUT', url, accessKeyId, secretAccessKey);
    
    // Embed auth in URL as query parameters for presigned URL
    const presignedUrl = `${url}&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${encodeURIComponent(auth.authorization.split('Credential=')[1].split(',')[0])}&X-Amz-Date=${auth['x-amz-date']}&X-Amz-SignedHeaders=host&X-Amz-Signature=${auth.authorization.split('Signature=')[1]}`;
    
    return new Response(JSON.stringify({ presignedUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

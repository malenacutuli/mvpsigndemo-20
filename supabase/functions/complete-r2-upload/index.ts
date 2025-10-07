import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, CompleteMultipartUploadCommand } from "https://deno.land/x/s3_lite_client@0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { uploadId, key, parts } = await req.json();

    if (!uploadId || !key || !parts) {
      throw new Error('Missing required parameters');
    }

    const accountId = Deno.env.get('CLOUDFLARE_R2_ACCOUNT_ID');
    const accessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    const bucketName = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME');

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error('Missing R2 configuration');
    }

    const s3Client = new S3Client({
      endPoint: `${accountId}.r2.cloudflarestorage.com`,
      region: 'auto',
      accessKey: accessKeyId,
      secretKey: secretAccessKey,
      bucket: bucketName,
      useSSL: true,
    });

    const command = new CompleteMultipartUploadCommand({
      Bucket: bucketName,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    });

    await s3Client.send(command);

    return new Response(
      JSON.stringify({
        success: true,
        url: `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error completing R2 upload:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

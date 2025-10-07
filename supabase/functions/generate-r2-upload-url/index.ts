import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, CreateMultipartUploadCommand } from "https://deno.land/x/s3_lite_client@0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName, fileType } = await req.json();

    if (!fileName) {
      throw new Error('fileName is required');
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

    const key = `videos/${crypto.randomUUID()}/${fileName}`;

    const command = new CreateMultipartUploadCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: fileType || 'video/mp4',
    });

    const result = await s3Client.send(command);

    return new Response(
      JSON.stringify({
        uploadId: result.UploadId,
        key: key,
        bucket: bucketName,
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating R2 upload URL:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

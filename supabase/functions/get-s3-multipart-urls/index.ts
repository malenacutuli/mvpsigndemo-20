import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from "https://esm.sh/@aws-sdk/client-s3@3.525.0";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.525.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { action, fileName, fileSize, uploadId, parts, key } = await req.json();

    const s3Client = new S3Client({
      region: Deno.env.get('AWS_REGION') || 'us-east-1',
      credentials: {
        accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!,
      },
    });

    const bucketName = 'axessvideo'; // Your S3 bucket name

    // Action: initiate multipart upload
    if (action === 'initiate') {
      const objectKey = `videos/${user.id}/${crypto.randomUUID()}-${fileName}`;
      
      const command = new CreateMultipartUploadCommand({
        Bucket: bucketName,
        Key: objectKey,
        ContentType: 'video/mp4',
      });

      const response = await s3Client.send(command);
      
      console.log('[S3-MULTIPART] Initiated upload:', {
        uploadId: response.UploadId,
        key: objectKey,
        fileSize,
      });

      return new Response(
        JSON.stringify({
          uploadId: response.UploadId,
          key: objectKey,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: get presigned URLs for parts
    if (action === 'getPresignedUrls') {
      const PART_SIZE = 10 * 1024 * 1024; // 10MB
      const totalParts = Math.ceil(fileSize / PART_SIZE);
      
      const presignedUrls = [];
      
      for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
        const command = new UploadPartCommand({
          Bucket: bucketName,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
        });

        const presignedUrl = await getSignedUrl(s3Client, command, { 
          expiresIn: 3600 // 1 hour
        });
        
        presignedUrls.push({
          partNumber,
          url: presignedUrl,
        });
      }

      console.log('[S3-MULTIPART] Generated presigned URLs:', {
        uploadId,
        totalParts,
      });

      return new Response(
        JSON.stringify({ presignedUrls }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: complete multipart upload
    if (action === 'complete') {
      const command = new CompleteMultipartUploadCommand({
        Bucket: bucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts.map((part: any) => ({
            ETag: part.ETag,
            PartNumber: part.PartNumber,
          })),
        },
      });

      const response = await s3Client.send(command);
      
      const s3Url = `https://${bucketName}.s3.${Deno.env.get('AWS_REGION') || 'us-east-1'}.amazonaws.com/${key}`;

      console.log('[S3-MULTIPART] Completed upload:', {
        uploadId,
        key,
        location: response.Location,
      });

      return new Response(
        JSON.stringify({ 
          success: true,
          url: s3Url,
          location: response.Location,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('[S3-MULTIPART] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { S3Client } from "https://deno.land/x/s3_lite_client@0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    const { key, uploadId, partNumber } = await req.json();
    if (!key || !uploadId || !partNumber) throw new Error("key, uploadId and partNumber are required");

    const accountId = Deno.env.get("CLOUDFLARE_R2_ACCOUNT_ID");
    const accessKeyId = Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY");
    const bucketName = Deno.env.get("CLOUDFLARE_R2_BUCKET_NAME");

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error("Missing R2 configuration");
    }

    const s3 = new S3Client({
      endPoint: `${accountId}.r2.cloudflarestorage.com`,
      region: "auto",
      accessKey: accessKeyId,
      secretKey: secretAccessKey,
      bucket: bucketName,
      useSSL: true,
      pathStyle: true,
    });

    const url = await s3.getPresignedUrl("PUT", key, {
      bucketName,
      parameters: {
        partNumber: String(partNumber),
        uploadId: String(uploadId),
      },
      expirySeconds: 3600,
    });

    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("[get-r2-part-url] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

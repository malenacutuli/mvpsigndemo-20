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

    const { uploadId, key, parts } = await req.json();
    if (!uploadId || !key || !Array.isArray(parts) || !parts.length) {
      throw new Error("uploadId, key and parts[] are required");
    }

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

    // Build XML body for completing multipart upload
    const partsXml = parts
      .sort((a: any, b: any) => a.PartNumber - b.PartNumber)
      .map((p: any) => `\n    <Part><PartNumber>${p.PartNumber}</PartNumber><ETag>${p.ETag}</ETag></Part>`) // ETag should include quotes
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<CompleteMultipartUpload>${partsXml}\n</CompleteMultipartUpload>`;

    const headers = new Headers({ "Content-Type": "application/xml" });

    await s3.makeRequest({
      method: "POST",
      bucketName,
      objectName: key,
      headers,
      query: { uploadId: String(uploadId) },
      payload: xml,
      statusCode: 200,
    });

    const url = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`;

    return new Response(JSON.stringify({ success: true, url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("[complete-r2-upload] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

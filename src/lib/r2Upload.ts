import { supabase } from "@/integrations/supabase/client";

const CHUNK_SIZE = 100 * 1024 * 1024; // 100MB per part

type UploadedPart = { PartNumber: number; ETag: string | null };

export async function uploadLargeVideoToR2(
  file: File,
  onProgress: (progress: number) => void
): Promise<string> {
  // 1) Initiate multipart upload
  const { data: initData, error: initError } = await supabase.functions.invoke(
    "generate-r2-upload-url",
    {
      body: {
        fileName: file.name,
        fileType: file.type,
      },
    }
  );

  if (initError) throw initError;
  if (!initData) throw new Error("No upload initiation data received");

  const { uploadId, key } = initData as { uploadId: string; key: string };

  // 2) Split file into chunks and upload each part via presigned URL
  const totalParts = Math.ceil(file.size / CHUNK_SIZE);
  const parts: UploadedPart[] = [];

  for (let i = 0; i < totalParts; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    const partNumber = i + 1;

    // Get a presigned URL for this part
    const { data: partUrlData, error: partUrlError } = await supabase.functions.invoke(
      "get-r2-part-url",
      {
        body: { key, uploadId, partNumber },
      }
    );
    if (partUrlError) throw partUrlError;

    const { url } = partUrlData as { url: string };

    const putRes = await fetch(url, {
      method: "PUT",
      body: chunk,
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
    });

    if (!putRes.ok) {
      throw new Error(`Failed to upload part ${partNumber} (${putRes.status})`);
    }

    const etag = putRes.headers.get("ETag");
    parts.push({ PartNumber: partNumber, ETag: etag });

    onProgress(Math.round(((i + 1) / totalParts) * 100));
  }

  // 3) Complete multipart upload
  const { data: completeData, error: completeError } = await supabase.functions.invoke(
    "complete-r2-upload",
    {
      body: {
        uploadId,
        key,
        parts,
      },
    }
  );

  if (completeError) throw completeError;
  if (!completeData || !completeData.url) throw new Error("Failed to complete upload");

  return completeData.url as string;
}

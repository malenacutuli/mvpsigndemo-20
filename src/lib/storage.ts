import { supabase } from "@/integrations/supabase/client";

export async function putObject(bucket: string, key: string, file: File | Buffer, contentType?: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(key, file, { 
      contentType: contentType || 'application/octet-stream',
      upsert: true 
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(key);

  return urlData.publicUrl;
}

export async function getSignedUrl(bucket: string, key: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(key, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

export async function deleteObject(bucket: string, key: string): Promise<void> {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([key]);

  if (error) throw error;
}
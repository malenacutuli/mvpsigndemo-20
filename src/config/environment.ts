/**
 * Centralized environment configuration for Supabase.
 *
 * All Supabase URLs and keys MUST be read from here so the project
 * can be pointed at any Supabase instance (Cloud, self-hosted, etc.)
 * by simply changing the VITE_* environment variables.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const supabaseProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;

export const config = {
  supabase: {
    /** Base API URL, e.g. https://<ref>.supabase.co */
    url: supabaseUrl,

    /** Anonymous / publishable key */
    anonKey: supabaseAnonKey,

    /** Project reference id */
    projectId: supabaseProjectId,

    /**
     * Storage URL – defaults to the standard Supabase path.
     * Override with VITE_SUPABASE_STORAGE_URL for self-hosted setups
     * where storage lives on a different host.
     */
    storageUrl:
      (import.meta.env.VITE_SUPABASE_STORAGE_URL as string) ||
      `${supabaseUrl}/storage/v1`,

    /**
     * TUS (resumable upload) endpoint.
     * Supabase Cloud uses <ref>.storage.supabase.co; self-hosted
     * typically uses the same base URL.  Override with
     * VITE_SUPABASE_TUS_URL if your setup differs.
     */
    tusUrl:
      (import.meta.env.VITE_SUPABASE_TUS_URL as string) ||
      `${supabaseUrl.replace('.supabase.co', '.storage.supabase.co')}/storage/v1/upload/resumable`,

    /**
     * Edge Functions base URL.
     * Override with VITE_SUPABASE_FUNCTIONS_URL for Deno Deploy
     * or self-hosted Edge Runtime.
     */
    functionsUrl:
      (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string) ||
      `${supabaseUrl}/functions/v1`,

    /**
     * WebSocket URL for Edge Functions (e.g. OpenAI Realtime proxy).
     * Override with VITE_SUPABASE_WS_URL for self-hosted setups.
     */
    wsUrl:
      (import.meta.env.VITE_SUPABASE_WS_URL as string) ||
      `wss://${supabaseProjectId}.functions.supabase.co`,
  },
} as const;

/**
 * Helper: build a public object URL for a given bucket + key.
 * Prefer supabase.storage.from(bucket).getPublicUrl(key) when possible;
 * use this only when you need a raw string URL.
 */
export function buildStoragePublicUrl(bucket: string, key: string): string {
  return `${config.supabase.storageUrl}/object/public/${bucket}/${key}`;
}

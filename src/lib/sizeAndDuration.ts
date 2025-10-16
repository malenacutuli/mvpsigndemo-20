// Size and duration detection for export routing decisions

export interface VideoMeta {
  bytes?: number | null;
  durationSec?: number | null;
  aslClips?: number;
  adTracks?: number;
}

export interface RouteThresholds {
  maxBrowserBytes: number;
  maxBrowserDurationSec: number;
  maxAslClips: number;
  maxAdTracks: number;
}

export const ROUTE_LIMITS: RouteThresholds = {
  maxBrowserBytes: 120 * 1024 * 1024,      // 120MB
  maxBrowserDurationSec: 7 * 60,           // 7 minutes  
  maxAslClips: 40,                         // ASL overlay limit
  maxAdTracks: 20,                         // Audio description limit
};

/**
 * Fetch video file size via HEAD request (avoids downloading)
 */
export async function fetchHeadSize(url: string): Promise<number | null> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : null;
  } catch (error) {
    console.warn('Failed to fetch HEAD size:', error);
    return null;
  }
}

/**
 * Get video duration from metadata without full download
 * Uses extended timeout for large files
 */
export async function getVideoDuration(url: string, timeoutMs: number = 60000): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.crossOrigin = 'anonymous';
    
    let resolved = false;
    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        video.removeAttribute('src');
        video.load();
      }
    };
    
    video.onloadedmetadata = () => {
      const duration = video.duration;
      console.log('[Duration] Video metadata loaded, duration:', duration);
      cleanup();
      resolve(isFinite(duration) && duration > 0 ? duration : null);
    };
    
    video.onerror = (e) => {
      console.warn('[Duration] Video metadata load error:', e);
      cleanup();
      resolve(null);
    };
    
    // Extended timeout for large files
    const timeout = setTimeout(() => {
      console.warn('[Duration] Metadata load timeout after', timeoutMs, 'ms');
      cleanup();
      resolve(null);
    }, timeoutMs);
    
    video.src = url;
    
    // Clear timeout if we resolve early
    video.addEventListener('loadedmetadata', () => clearTimeout(timeout), { once: true });
  });
}

/**
 * Check if video should use server-side export based on size/complexity
 */
export function shouldUseServerExport(meta: VideoMeta): boolean {
  return (
    (meta.bytes ?? 0) > ROUTE_LIMITS.maxBrowserBytes ||
    (meta.durationSec ?? 0) > ROUTE_LIMITS.maxBrowserDurationSec ||
    (meta.aslClips ?? 0) > ROUTE_LIMITS.maxAslClips ||
    (meta.adTracks ?? 0) > ROUTE_LIMITS.maxAdTracks
  );
}

/**
 * Generate warning message for large videos
 */
export function warnIfLarge(meta: VideoMeta): string | null {
  const { bytes, durationSec, aslClips, adTracks } = meta;
  
  const tooBig = (bytes ?? 0) > ROUTE_LIMITS.maxBrowserBytes;
  const tooLong = (durationSec ?? 0) > ROUTE_LIMITS.maxBrowserDurationSec;
  const tooManyASL = (aslClips ?? 0) > ROUTE_LIMITS.maxAslClips;
  const tooManyAD = (adTracks ?? 0) > ROUTE_LIMITS.maxAdTracks;
  
  if (tooBig || tooLong || tooManyASL || tooManyAD) {
    const reasons = [];
    if (tooBig) reasons.push(`file size: ${Math.round((bytes ?? 0) / 1024 / 1024)}MB`);
    if (tooLong) reasons.push(`duration: ${Math.round((durationSec ?? 0) / 60)}min`);
    if (tooManyASL) reasons.push(`${aslClips} ASL clips`);
    if (tooManyAD) reasons.push(`${adTracks} audio descriptions`);
    
    return `⚠️ Large video detected (${reasons.join(', ')}). Browser export may be slow or fail. Consider using Server Export for better performance.`;
  }
  
  return null;
}

/**
 * Format bytes for display
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format duration for display  
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
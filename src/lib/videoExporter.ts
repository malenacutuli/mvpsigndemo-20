/**
 * Video export configuration and download utilities
 * Note: Full video re-encoding requires server-side processing
 * This module provides export settings UI and original video download
 */

export interface ExportOptions {
  codec: string;
  quality: string;
  videoBitrate: number;
  audioBitrate: number;
  maxWidth?: number;
  maxHeight?: number;
  fps?: number;
  rotation?: 0 | 90 | 180 | 270;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ExportResult {
  blob: Blob;
  url: string;
  duration: number;
  fileSize: number;
}

/**
 * Download original video file
 */
export function downloadOriginalVideo(file: File, filename?: string) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || file.name;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Estimate export time based on video duration and quality
 */
export function estimateExportTime(durationSeconds: number, quality: string): number {
  // Rough estimates in seconds per video second
  const speedMap: Record<string, number> = {
    'very-low': 0.5,
    'low': 1,
    'medium': 2,
    'high': 4,
    'very-high': 8,
    'custom': 3
  };
  
  const speed = speedMap[quality] || 2;
  return durationSeconds * speed;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1_073_741_824) {
    return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
  }
  if (bytes >= 1_048_576) {
    return `${(bytes / 1_048_576).toFixed(2)} MB`;
  }
  return `${(bytes / 1_024).toFixed(2)} KB`;
}

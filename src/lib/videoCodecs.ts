/**
 * Video codec configuration and compatibility checking
 */

export interface CodecInfo {
  id: string;
  name: string;
  description: string;
  mimeType: string;
  fileExtension: string;
  supportsAlpha: boolean;
  supportsHDR: boolean;
  browserSupport: {
    chrome: boolean;
    firefox: boolean;
    safari: boolean;
    edge: boolean;
  };
  recommendedFor: string[];
}

export const VIDEO_CODECS: Record<string, CodecInfo> = {
  'avc': {
    id: 'avc',
    name: 'H.264 / AVC',
    description: 'Universal codec with excellent compatibility',
    mimeType: 'video/mp4; codecs="avc1.42E01E"',
    fileExtension: 'mp4',
    supportsAlpha: false,
    supportsHDR: false,
    browserSupport: {
      chrome: true,
      firefox: true,
      safari: true,
      edge: true
    },
    recommendedFor: ['Web delivery', 'Maximum compatibility', 'Social media']
  },
  'hevc': {
    id: 'hevc',
    name: 'H.265 / HEVC',
    description: 'Better compression than H.264, limited browser support',
    mimeType: 'video/mp4; codecs="hvc1.1.6.L93.B0"',
    fileExtension: 'mp4',
    supportsAlpha: false,
    supportsHDR: true,
    browserSupport: {
      chrome: false,
      firefox: false,
      safari: true,
      edge: true
    },
    recommendedFor: ['4K/HDR content', 'Apple devices', 'File size optimization']
  },
  'vp9': {
    id: 'vp9',
    name: 'VP9',
    description: 'Open source, supports transparency and HDR',
    mimeType: 'video/webm; codecs="vp9"',
    fileExtension: 'webm',
    supportsAlpha: true,
    supportsHDR: true,
    browserSupport: {
      chrome: true,
      firefox: true,
      safari: false,
      edge: true
    },
    recommendedFor: ['Transparency', 'Web video', 'YouTube']
  },
  'av1': {
    id: 'av1',
    name: 'AV1',
    description: 'Next-gen codec with best compression',
    mimeType: 'video/mp4; codecs="av01.0.05M.08"',
    fileExtension: 'mp4',
    supportsAlpha: true,
    supportsHDR: true,
    browserSupport: {
      chrome: true,
      firefox: true,
      safari: true,
      edge: true
    },
    recommendedFor: ['Future-proof', 'Streaming', 'Best compression']
  },
  'vp8': {
    id: 'vp8',
    name: 'VP8',
    description: 'Older open codec, supports transparency',
    mimeType: 'video/webm; codecs="vp8"',
    fileExtension: 'webm',
    supportsAlpha: true,
    supportsHDR: false,
    browserSupport: {
      chrome: true,
      firefox: true,
      safari: false,
      edge: true
    },
    recommendedFor: ['Legacy web video', 'Transparency (older browsers)']
  }
};

export interface QualityPreset {
  id: string;
  name: string;
  description: string;
  videoBitrate: number; // bits per second
  audioBitrate: number; // bits per second
  maxWidth?: number;
  maxHeight?: number;
  fps?: number;
  keyFrameInterval?: number; // seconds
}

export const QUALITY_PRESETS: Record<string, QualityPreset> = {
  'very-low': {
    id: 'very-low',
    name: 'Very Low',
    description: 'Smallest file size, lowest quality',
    videoBitrate: 500_000, // 500 kbps
    audioBitrate: 64_000, // 64 kbps
    maxWidth: 640,
    maxHeight: 360,
    fps: 24,
    keyFrameInterval: 10
  },
  'low': {
    id: 'low',
    name: 'Low',
    description: 'Small file size, acceptable quality',
    videoBitrate: 1_000_000, // 1 Mbps
    audioBitrate: 96_000, // 96 kbps
    maxWidth: 854,
    maxHeight: 480,
    fps: 30,
    keyFrameInterval: 5
  },
  'medium': {
    id: 'medium',
    name: 'Medium',
    description: 'Balanced quality and file size',
    videoBitrate: 2_500_000, // 2.5 Mbps
    audioBitrate: 128_000, // 128 kbps
    maxWidth: 1280,
    maxHeight: 720,
    fps: 30,
    keyFrameInterval: 3
  },
  'high': {
    id: 'high',
    name: 'High',
    description: 'High quality, larger file size',
    videoBitrate: 5_000_000, // 5 Mbps
    audioBitrate: 192_000, // 192 kbps
    maxWidth: 1920,
    maxHeight: 1080,
    keyFrameInterval: 2
  },
  'very-high': {
    id: 'very-high',
    name: 'Very High',
    description: 'Maximum quality, large file size',
    videoBitrate: 10_000_000, // 10 Mbps
    audioBitrate: 256_000, // 256 kbps
    maxWidth: 3840,
    maxHeight: 2160,
    keyFrameInterval: 2
  },
  'custom': {
    id: 'custom',
    name: 'Custom',
    description: 'Manually configure all settings',
    videoBitrate: 2_500_000,
    audioBitrate: 128_000
  }
};

/**
 * Check if a codec is supported in the current browser
 */
export function isCodecSupported(codecId: string): boolean {
  const codec = VIDEO_CODECS[codecId];
  if (!codec) return false;

  // Create a test video element
  const video = document.createElement('video');
  
  try {
    return video.canPlayType(codec.mimeType) !== '';
  } catch {
    return false;
  }
}

/**
 * Get recommended codec based on requirements
 */
export function getRecommendedCodec(options: {
  needsAlpha?: boolean;
  needsHDR?: boolean;
  maxCompatibility?: boolean;
  bestCompression?: boolean;
}): string {
  const { needsAlpha, needsHDR, maxCompatibility, bestCompression } = options;

  if (maxCompatibility) {
    return 'avc'; // H.264 is universally supported
  }

  if (needsAlpha) {
    if (bestCompression && isCodecSupported('av1')) {
      return 'av1';
    }
    return isCodecSupported('vp9') ? 'vp9' : 'vp8';
  }

  if (needsHDR) {
    if (isCodecSupported('av1')) {
      return 'av1';
    }
    if (isCodecSupported('hevc')) {
      return 'hevc';
    }
    return 'vp9';
  }

  if (bestCompression && isCodecSupported('av1')) {
    return 'av1';
  }

  return 'avc'; // Default to H.264
}

/**
 * Get codec compatibility warnings
 */
export function getCodecWarnings(codecId: string): string[] {
  const codec = VIDEO_CODECS[codecId];
  if (!codec) return ['Unknown codec'];

  const warnings: string[] = [];

  // Check browser support
  const unsupportedBrowsers = Object.entries(codec.browserSupport)
    .filter(([_, supported]) => !supported)
    .map(([browser]) => browser.charAt(0).toUpperCase() + browser.slice(1));

  if (unsupportedBrowsers.length > 0) {
    warnings.push(`Not supported in: ${unsupportedBrowsers.join(', ')}`);
  }

  // Additional warnings
  if (codecId === 'hevc') {
    warnings.push('May require licensing fees for commercial use');
  }

  if (codecId === 'av1') {
    warnings.push('Encoding is slower than older codecs');
  }

  if (!codec.supportsAlpha) {
    warnings.push('Does not support transparency (alpha channel)');
  }

  return warnings;
}

/**
 * Format bitrate for display
 */
export function formatBitrate(bitsPerSecond: number): string {
  if (bitsPerSecond >= 1_000_000) {
    return `${(bitsPerSecond / 1_000_000).toFixed(1)} Mbps`;
  }
  return `${(bitsPerSecond / 1_000).toFixed(0)} kbps`;
}

/**
 * Estimate file size based on duration and bitrate
 */
export function estimateFileSize(durationSeconds: number, totalBitrate: number): string {
  const bytes = (durationSeconds * totalBitrate) / 8;
  
  if (bytes >= 1_073_741_824) {
    return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
  }
  if (bytes >= 1_048_576) {
    return `${(bytes / 1_048_576).toFixed(2)} MB`;
  }
  return `${(bytes / 1_024).toFixed(2)} KB`;
}

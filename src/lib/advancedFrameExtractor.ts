/**
 * Advanced frame extraction using Mediabunny packet-level API
 * Features:
 * - Extract only key frames for faster, higher quality snapshots
 * - Handle transparent video frames (alpha channel support)
 * - Efficient frame navigation (jump between key frames)
 */

import { 
  Input, 
  BlobSource, 
  VideoSampleSink, 
  EncodedPacketSink,
  ALL_FORMATS,
  type InputVideoTrack 
} from 'mediabunny';

export interface AdvancedFrameOptions {
  /** Extract only key frames (faster, better quality) */
  keyFramesOnly?: boolean;
  /** Support transparent video (alpha channel) */
  preserveAlpha?: boolean;
  /** Maximum number of frames to extract */
  maxFrames?: number;
  /** Quality for JPEG output (0-1), ignored if alpha is preserved */
  quality?: number;
  /** Max dimensions for output */
  maxWidth?: number;
  maxHeight?: number;
}

export interface ExtractedFrame {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  timestamp: number; // in seconds
  isKeyFrame: boolean;
  hasAlpha: boolean;
}

export interface TrackInfo {
  type: 'video' | 'audio' | 'subtitle';
  codec: string;
  bitrate?: number;
  language?: string;
  disposition?: {
    default: boolean;
    forced: boolean;
    hearingImpaired: boolean;
    visuallyImpaired: boolean;
    commentary: boolean;
  };
  channels?: number; // for audio
  sampleRate?: number; // for audio
  colorSpace?: string; // for video
  colorRange?: string; // for video
  hdr?: boolean; // for video
}

export interface VideoFrameMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  hasAlpha: boolean;
  keyFrameTimestamps: number[]; // timestamps of all key frames
  totalFrames: number;
  totalKeyFrames: number;
  tracks: TrackInfo[];
  colorSpace?: string;
  colorRange?: string;
  hdr?: boolean;
  bitrate?: number;
}

/**
 * Analyzes video to extract metadata including key frame positions
 */
export async function analyzeVideoFrames(videoFile: File): Promise<VideoFrameMetadata> {
  const blob = videoFile;
  
  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(blob, {
      maxCacheSize: 16 * 1024 * 1024
    })
  });

  const videoTrack = await input.getPrimaryVideoTrack();
  
  if (!videoTrack) {
    throw new Error('No video track found in file');
  }

  const duration = await videoTrack.computeDuration();
  const packetStats = await videoTrack.computePacketStats(200);
  
  // Analyze all tracks
  const tracks: TrackInfo[] = [];
  
  // Video tracks
  const videoTracks = await input.getVideoTracks();
  for (const vTrack of videoTracks) {
    const vStats = await vTrack.computePacketStats(100);
    tracks.push({
      type: 'video',
      codec: vTrack.codec || 'unknown',
      bitrate: vStats.averageBitrate,
      disposition: vTrack.disposition ? {
        default: vTrack.disposition.default,
        forced: vTrack.disposition.forced,
        hearingImpaired: vTrack.disposition.hearingImpaired,
        visuallyImpaired: vTrack.disposition.visuallyImpaired,
        commentary: vTrack.disposition.commentary
      } : undefined
    });
  }
  
  // Audio tracks
  const audioTracks = await input.getAudioTracks();
  for (const aTrack of audioTracks) {
    const aStats = await aTrack.computePacketStats(100);
    tracks.push({
      type: 'audio',
      codec: aTrack.codec || 'unknown',
      bitrate: aStats.averageBitrate,
      sampleRate: aTrack.sampleRate,
      disposition: aTrack.disposition ? {
        default: aTrack.disposition.default,
        forced: aTrack.disposition.forced,
        hearingImpaired: aTrack.disposition.hearingImpaired,
        visuallyImpaired: aTrack.disposition.visuallyImpaired,
        commentary: aTrack.disposition.commentary
      } : undefined
    });
  }
  
  // Use EncodedPacketSink to analyze all packets
  const packetSink = new EncodedPacketSink(videoTrack);
  const keyFrameTimestamps: number[] = [];
  let totalFrames = 0;
  
  // Collect packet data
  const packetIterator = packetSink.packets();
  
  for await (const packet of packetIterator) {
    totalFrames++;
    
    // Check if this is a key frame
    if (packet.type === 'key') {
      const timestampSeconds = packet.timestamp / 1_000_000;
      keyFrameTimestamps.push(timestampSeconds);
    }
  }

  const metadata: VideoFrameMetadata = {
    duration,
    width: videoTrack.displayWidth,
    height: videoTrack.displayHeight,
    fps: packetStats.averagePacketRate,
    codec: videoTrack.codec || 'unknown',
    hasAlpha: videoTrack.codec === 'vp8' || videoTrack.codec === 'vp9',
    keyFrameTimestamps,
    totalFrames,
    totalKeyFrames: keyFrameTimestamps.length,
    tracks,
    bitrate: packetStats.averageBitrate
  };

  console.log('📊 Video analysis:', {
    ...metadata,
    keyFrameInterval: metadata.keyFrameTimestamps.length > 1 
      ? (metadata.duration / metadata.keyFrameTimestamps.length).toFixed(2) + 's'
      : 'N/A'
  });

  return metadata;
}

/**
 * Finds the nearest key frame timestamp to the target time
 */
export function findNearestKeyFrame(
  targetTime: number,
  keyFrameTimestamps: number[]
): number {
  if (keyFrameTimestamps.length === 0) return targetTime;
  
  return keyFrameTimestamps.reduce((nearest, timestamp) => {
    return Math.abs(timestamp - targetTime) < Math.abs(nearest - targetTime)
      ? timestamp
      : nearest;
  });
}

/**
 * Extracts a single frame at the specified timestamp
 */
export async function extractFrameAt(
  videoFile: File,
  timestamp: number,
  options: AdvancedFrameOptions = {}
): Promise<ExtractedFrame> {
  const {
    keyFramesOnly = false,
    preserveAlpha = false,
    quality = 0.9,
    maxWidth = 1920,
    maxHeight = 1080
  } = options;

  const blob = videoFile;
  
  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(blob, {
      maxCacheSize: 16 * 1024 * 1024
    })
  });

  const videoTrack = await input.getPrimaryVideoTrack();

  if (!videoTrack) {
    throw new Error('No video track found');
  }

  // If key frames only, find nearest key frame
  let targetTime = timestamp;
  if (keyFramesOnly) {
    const metadata = await analyzeVideoFrames(videoFile);
    targetTime = findNearestKeyFrame(timestamp, metadata.keyFrameTimestamps);
    console.log(`🔑 Adjusted timestamp from ${timestamp}s to key frame at ${targetTime}s`);
  }

  // Create video sink to get decoded frames
  const videoSink = new VideoSampleSink(videoTrack);

  // Get sample at target time
  const sample = await videoSink.getSample(targetTime);
  
  if (!sample) {
    throw new Error(`No frame found at ${targetTime}s`);
  }

  try {
    // Create canvas for rendering
    const canvas = document.createElement('canvas');
    const sampleWidth = sample.codedWidth;
    const sampleHeight = sample.codedHeight;
    const aspectRatio = sampleWidth / sampleHeight;
    
    let canvasWidth = Math.min(sampleWidth, maxWidth);
    let canvasHeight = Math.min(sampleHeight, maxHeight);

    // Maintain aspect ratio
    if (canvasWidth / canvasHeight > aspectRatio) {
      canvasWidth = canvasHeight * aspectRatio;
    } else {
      canvasHeight = canvasWidth / aspectRatio;
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const ctx = canvas.getContext('2d', { 
      alpha: preserveAlpha,
      willReadFrequently: false 
    });

    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }

    // Draw sample to canvas
    sample.draw(ctx, 0, 0, canvasWidth, canvasHeight);

    // Check if frame has meaningful alpha data
    let hasAlpha = false;
    if (preserveAlpha) {
      const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      const alphaData = imageData.data;
      
      for (let i = 3; i < alphaData.length; i += 4) {
        if (alphaData[i] < 255) {
          hasAlpha = true;
          break;
        }
      }
    }

    // Convert to blob (PNG if alpha, JPEG otherwise)
    const mimeType = (preserveAlpha && hasAlpha) ? 'image/png' : 'image/jpeg';
    const frameBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          resolve(blob);
        },
        mimeType,
        mimeType === 'image/jpeg' ? quality : undefined
      );
    });

    const dataUrl = canvas.toDataURL(mimeType, quality);

    const extractedFrame: ExtractedFrame = {
      blob: frameBlob,
      dataUrl,
      width: canvasWidth,
      height: canvasHeight,
      timestamp: targetTime,
      isKeyFrame: keyFramesOnly,
      hasAlpha: hasAlpha && preserveAlpha
    };

    console.log(`✅ Frame extracted at ${extractedFrame.timestamp.toFixed(2)}s:`, {
      size: `${extractedFrame.width}x${extractedFrame.height}`,
      format: mimeType,
      fileSize: `${(frameBlob.size / 1024).toFixed(2)}KB`,
      hasAlpha: extractedFrame.hasAlpha
    });

    sample.close();
    
    return extractedFrame;
  } catch (error) {
    sample.close();
    throw error;
  }
}

/**
 * Extracts all key frames from a video
 */
export async function extractAllKeyFrames(
  videoFile: File,
  options: AdvancedFrameOptions = {}
): Promise<ExtractedFrame[]> {
  const { maxFrames = 50 } = options;

  // First, analyze to find all key frames
  const metadata = await analyzeVideoFrames(videoFile);
  
  console.log(`🔑 Found ${metadata.totalKeyFrames} key frames`);

  // Limit number of key frames to extract
  const timestamps = metadata.keyFrameTimestamps.slice(0, maxFrames);

  // Extract each key frame
  const frames: ExtractedFrame[] = [];
  for (const timestamp of timestamps) {
    try {
      const frame = await extractFrameAt(videoFile, timestamp, {
        ...options,
        keyFramesOnly: true
      });
      frames.push(frame);
    } catch (error) {
      console.warn(`Failed to extract key frame at ${timestamp}s:`, error);
    }
  }

  console.log(`✅ Extracted ${frames.length} key frames`);
  return frames;
}

/**
 * Extracts frames at evenly distributed intervals, preferring key frames
 */
export async function extractDistributedFrames(
  videoFile: File,
  frameCount: number = 5,
  options: AdvancedFrameOptions = {}
): Promise<ExtractedFrame[]> {
  // Analyze video first
  const metadata = await analyzeVideoFrames(videoFile);

  // Calculate ideal timestamps
  const interval = metadata.duration / (frameCount + 1);
  const targetTimestamps = Array.from(
    { length: frameCount },
    (_, i) => interval * (i + 1)
  );

  // Find nearest key frame for each target
  const extractTimestamps = targetTimestamps.map(target =>
    findNearestKeyFrame(target, metadata.keyFrameTimestamps)
  );

  // Remove duplicates
  const uniqueTimestamps = [...new Set(extractTimestamps)];

  console.log(`📸 Extracting ${uniqueTimestamps.length} frames at:`, 
    uniqueTimestamps.map(t => t.toFixed(2) + 's')
  );

  // Extract frames
  const frames: ExtractedFrame[] = [];
  for (const timestamp of uniqueTimestamps) {
    try {
      const frame = await extractFrameAt(videoFile, timestamp, {
        ...options,
        keyFramesOnly: true
      });
      frames.push(frame);
    } catch (error) {
      console.warn(`Failed to extract frame at ${timestamp}s:`, error);
    }
  }

  return frames;
}

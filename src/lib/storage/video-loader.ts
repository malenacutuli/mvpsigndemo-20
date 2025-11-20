import { supabase } from '@/integrations/supabase/client';

interface VideoLoadOptions {
  preferCached?: boolean;
  quality?: 'original' | 'optimized';
}

export class VideoLoader {
  private r2Endpoint: string;
  private cacheMap: Map<string, string> = new Map();

  constructor(r2Endpoint?: string) {
    this.r2Endpoint = r2Endpoint || 'https://pub-e33801e0b13f4c1ea0de2a755bc6f756.r2.dev';
  }

  /**
   * Load video from Supabase storage
   */
  async loadFromSupabase(path: string): Promise<string> {
    const { data } = supabase.storage
      .from('videos')
      .getPublicUrl(path);

    if (data?.publicUrl) {
      return data.publicUrl;
    }

    // Fallback to manual URL construction
    return `https://faeyekynudyzeotbjfsj.supabase.co/storage/v1/object/public/videos/${path}`;
  }

  /**
   * Load video from Cloudflare R2 CDN
   */
  async loadFromCloudflare(key: string): Promise<string> {
    return `${this.r2Endpoint}/${key}`;
  }

  /**
   * Check if video exists in R2 cache
   */
  private async checkR2Cache(videoId: string): Promise<string | null> {
    // Check memory cache first
    if (this.cacheMap.has(videoId)) {
      return this.cacheMap.get(videoId)!;
    }

    try {
      // Try to HEAD request the R2 URL to see if it exists
      const r2Url = `${this.r2Endpoint}/${videoId}`;
      const response = await fetch(r2Url, { method: 'HEAD' });
      
      if (response.ok) {
        this.cacheMap.set(videoId, r2Url);
        return r2Url;
      }
    } catch (error) {
      console.log('R2 cache miss for', videoId);
    }

    return null;
  }

  /**
   * Smart loading: Try R2 cache first, fallback to Supabase
   */
  async loadOptimized(videoId: string, storagePath?: string): Promise<string> {
    // Try R2 cache first for faster delivery
    const cached = await this.checkR2Cache(videoId);
    if (cached) {
      console.log('VideoLoader: Using R2 cached version');
      return cached;
    }

    // Fallback to Supabase storage
    if (storagePath) {
      console.log('VideoLoader: Loading from Supabase storage');
      return this.loadFromSupabase(storagePath);
    }

    throw new Error('No video path available');
  }

  /**
   * Load video with options
   */
  async load(videoId: string, storagePath?: string, options: VideoLoadOptions = {}): Promise<string> {
    const { preferCached = true, quality = 'original' } = options;

    // For optimized quality, try smart loading
    if (quality === 'optimized' && preferCached) {
      try {
        return await this.loadOptimized(videoId, storagePath);
      } catch (error) {
        console.warn('Optimized loading failed, falling back to original');
      }
    }

    // Load from Supabase as default
    if (storagePath) {
      return this.loadFromSupabase(storagePath);
    }

    throw new Error('No video source available');
  }

  /**
   * Preload video for smoother playback
   */
  async preload(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.src = url;

      video.addEventListener('loadeddata', () => {
        console.log('VideoLoader: Preloaded', url);
        resolve();
      });

      video.addEventListener('error', (e) => {
        console.error('VideoLoader: Preload failed', e);
        reject(e);
      });
    });
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cacheMap.clear();
  }
}

// Singleton instance
export const videoLoader = new VideoLoader();

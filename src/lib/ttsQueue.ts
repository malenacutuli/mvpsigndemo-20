/**
 * TTS Request Queue Manager
 * Limits concurrent requests to prevent hitting ElevenLabs' rate limits (20 concurrent max)
 */

type QueuedRequest<T> = {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
};

class TTSQueue {
  private queue: QueuedRequest<any>[] = [];
  private activeRequests = 0;
  private maxConcurrent: number;
  private retryDelay = 2000; // 2 seconds base delay for 429 errors

  constructor(maxConcurrent = 2) {
    this.maxConcurrent = maxConcurrent; // Very conservative limit to avoid 429 errors
  }

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.activeRequests >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const request = this.queue.shift();
    if (!request) return;

    this.activeRequests++;

    try {
      const result = await request.fn();
      request.resolve(result);
    } catch (error: any) {
      // Check if it's a 429 error and add delay before processing next
      if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('too many')) {
        console.warn('🚦 TTS Queue: 429 rate limit detected, pausing queue for', this.retryDelay, 'ms');
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        this.retryDelay = Math.min(this.retryDelay * 1.5, 10000); // Exponential backoff up to 10s
      } else {
        this.retryDelay = 2000; // Reset delay on non-429 errors
      }
      request.reject(error);
    } finally {
      this.activeRequests--;
      this.processQueue(); // Process next item
    }
  }

  getQueueStatus() {
    return {
      queued: this.queue.length,
      active: this.activeRequests,
      maxConcurrent: this.maxConcurrent
    };
  }
}

// Singleton instance - limited to 2 concurrent to avoid ElevenLabs rate limits
export const ttsQueue = new TTSQueue(2);

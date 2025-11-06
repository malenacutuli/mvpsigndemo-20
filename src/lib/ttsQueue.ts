/**
 * TTS Request Queue Manager
 * Limits concurrent requests to prevent hitting ElevenLabs' rate limits (20 concurrent max)
 */

type QueuedRequest<T> = {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  retryCount?: number; // Track retry attempts
};

class TTSQueue {
  private queue: QueuedRequest<any>[] = [];
  private activeRequests = 0;
  private maxConcurrent: number;
  private retryDelay = 2000; // 2 seconds base delay for 429 errors
  private maxRetries = 5; // Maximum retry attempts per request

  constructor(maxConcurrent = 2) {
    this.maxConcurrent = maxConcurrent; // Very conservative limit to avoid 429 errors
  }

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject, retryCount: 0 });
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
      this.retryDelay = 2000; // Reset delay on success
    } catch (error: any) {
      const currentRetryCount = request.retryCount || 0;
      
      // Check if it's a 429 error - auto-retry with backoff
      if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('too many')) {
        if (currentRetryCount < this.maxRetries) {
          console.warn(`🚦 TTS Queue: 429 rate limit detected (attempt ${currentRetryCount + 1}/${this.maxRetries}), pausing for ${this.retryDelay}ms`);
          
          // Increment retry count and re-enqueue at the FRONT
          request.retryCount = currentRetryCount + 1;
          this.queue.unshift(request);
          
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          this.retryDelay = Math.min(this.retryDelay * 1.5, 10000); // Exponential backoff up to 10s
        } else {
          // Max retries exceeded
          console.error(`❌ TTS Queue: Max retries (${this.maxRetries}) exceeded for 429 error`);
          this.retryDelay = 2000;
          request.reject(new Error(`Rate limit exceeded after ${this.maxRetries} retries. Please try again later.`));
        }
      } else {
        // Non-429 errors: reject immediately and reset delay
        this.retryDelay = 2000;
        request.reject(error);
      }
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

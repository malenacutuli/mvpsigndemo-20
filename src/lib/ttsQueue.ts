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

  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent; // Conservative limit (well below 20)
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
    } catch (error) {
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

// Singleton instance
export const ttsQueue = new TTSQueue(5);

// src/lib/ffmpegLoader.ts
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

/**
 * IMPORTANT:
 * - Make sure package.json has "@ffmpeg/ffmpeg": "0.12.15" (exact or ^0.12.15)
 * - This loader fetches the matching @ffmpeg/core v0.12.15 from CDN.
 */
const CORE_VERSION = '0.12.15';

// Strict, ordered fallbacks: jsDelivr → unpkg
const SOURCES = [
  `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`,
  `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`,
];

let instance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

/** Public: get a ready-to-use FFmpeg instance (singleton). */
export async function getFFmpeg(): Promise<FFmpeg> {
  if (instance?.loaded) return instance;

  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    console.log(`[FFmpeg] init → targeting @ffmpeg/core@${CORE_VERSION}`);
    const ff = new FFmpeg();

    // Debug logs
    ff.on('log', ({ message }) => console.log('[FFmpeg]', message));
    ff.on('progress', ({ progress, time }) => {
      const pct = Math.round((progress ?? 0) * 100);
      console.log(`[FFmpeg] progress = ${pct}% @ time=${time ?? 'n/a'}`);
    });

    let lastErr: unknown = null;

    for (const baseURL of SOURCES) {
      try {
        console.log(`[FFmpeg] trying source: ${baseURL}`);
        // Fetch the core files as Blob URLs so we avoid CORS / MIME issues
        const [coreURL, wasmURL, workerURL] = await Promise.all([
          toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
        ]);

        console.log('[FFmpeg] core files fetched; loading…');
        await ff.load({ coreURL, wasmURL, workerURL });
        console.log(`[FFmpeg] load OK from ${baseURL}`);

        // Self-test: verify the runtime is *actually* alive
        console.log('[FFmpeg] self-test: exec -version');
        await ff.exec(['-version']);

        // Tiny FS sanity check
        const testName = 'ffprobe_smoketest.txt';
        await ff.writeFile(testName, new TextEncoder().encode('ok'));
        const listing = await ff.listDir('/');
        console.log('[FFmpeg] FS list(/):', listing);

        instance = ff;
        return ff;
      } catch (e) {
        console.error(`[FFmpeg] load failed from ${baseURL}`, e);
        lastErr = e;
        // try next source
      }
    }

    throw lastErr ?? new Error(`FFmpeg load failed from all sources (core ${CORE_VERSION}).`);
  })();

  try {
    return await loadPromise;
  } finally {
    // Allow future re-load attempts if this one threw
    loadPromise = null;
  }
}

/** Optional: proactively confirm FFmpeg is ready. Great for a debug button. */
export async function testFFmpegLoad(): Promise<void> {
  console.log(`[FFmpeg Test] start (core=${CORE_VERSION})`);
  const ff = await getFFmpeg();
  await ff.exec(['-version']);
  console.log('[FFmpeg Test] version OK, instance ready:', ff);
  // eslint-disable-next-line no-alert
  alert(`FFmpeg is ready (core ${CORE_VERSION}). Check console for details.`);
}

/** Optional helpers */
export function isFFmpegReady(): boolean {
  return Boolean(instance?.loaded);
}

export function terminateFFmpeg(): void {
  try {
    instance?.terminate?.();
  } catch (e) {
    console.warn('[FFmpeg] terminate error:', e);
  } finally {
    instance = null;
    loadPromise = null;
  }
}
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

// Use exact version matching the installed @ffmpeg/ffmpeg package (0.12.15)
const CORE_VERSION = '0.12.15';

// Order matters: jsDelivr → unpkg fallback
const SOURCES = [
  `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`,
  `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`,
];

let instance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export async function getFFmpeg(): Promise<FFmpeg> {
  if (instance?.loaded) return instance!;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    console.log(`[FFmpeg] Initializing FFmpeg with @ffmpeg/core version ${CORE_VERSION}`);
    const ff = new FFmpeg();
    ff.on('log', ({ message }) => console.log('[FFmpeg]', message));
    ff.on('progress', ({ progress }) => {
      console.log('[FFmpeg] progress', Math.round(progress * 100) + '%');
    });

    let lastErr: any = null;
    for (const baseURL of SOURCES) {
      try {
        console.log(`[FFmpeg] Loading core from: ${baseURL}`);
        console.log(`[FFmpeg] Fetching core files from ${baseURL}...`);
        
        const [coreURL, wasmURL, workerURL] = await Promise.all([
          toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
        ]);
        
        console.log(`[FFmpeg] Core files fetched successfully from ${baseURL}`);
        console.log(`[FFmpeg] Loading FFmpeg instance...`);
        
        await ff.load({ coreURL, wasmURL, workerURL });
        console.log(`[FFmpeg] FFmpeg loaded successfully from: ${baseURL}`);

        // Self-test
        console.log(`[FFmpeg] Running self-test...`);
        await ff.exec(['-version']);
        console.log(`[FFmpeg] Self-test passed - FFmpeg is ready`);
        
        instance = ff;
        return ff;
      } catch (e) {
        console.error(`[FFmpeg] Failed to load from ${baseURL}:`, e);
        lastErr = e;
      }
    }
    throw lastErr ?? new Error(`FFmpeg load failed from all sources. Core version: ${CORE_VERSION}`);
  })();

  try {
    return await loadPromise;
  } finally {
    loadPromise = null;
  }
}

// Smoke test function
export async function testFFmpegLoad() {
  try {
    console.log(`[FFmpeg Test] Starting FFmpeg test with core version ${CORE_VERSION}`);
    const ff = await getFFmpeg();
    console.log('[FFmpeg Test] FFmpeg instance ready:', ff);
    await ff.exec(['-version']);
    console.log('[FFmpeg Test] Version check passed');
    alert(`FFmpeg test succeeded! Using core version ${CORE_VERSION}`);
  } catch (e: any) {
    console.error('[FFmpeg Test] Test failed:', e);
    alert(`FFmpeg test failed: ${e?.message ?? e}\nCore version attempted: ${CORE_VERSION}`);
  }
}

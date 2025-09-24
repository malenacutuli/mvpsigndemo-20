import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

const CORE_VERSION = '0.12.15';
// Order matters: jsDelivr → unpkg → (optional) local
const SOURCES = [
  `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`,
  `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`,
  // Optional local mirror (dev only). Keep commented unless you actually serve all 3 files with correct MIME.
//  `/ffmpeg/${CORE_VERSION}`
];

let instance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export async function getFFmpeg(): Promise<FFmpeg> {
  if (instance?.loaded) return instance!;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const ff = new FFmpeg();
    ff.on('log', ({ message }) => console.log('[FFmpeg]', message));
    ff.on('progress', ({ progress }) => {
      console.log('[FFmpeg] progress', Math.round(progress * 100) + '%');
    });

    let lastErr: any = null;
    for (const baseURL of SOURCES) {
      try {
        console.log('[FFmpeg] trying source:', baseURL);
        const [coreURL, wasmURL, workerURL] = await Promise.all([
          toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
        ]);
        await ff.load({ coreURL, wasmURL, workerURL });
        console.log('[FFmpeg] load ok from:', baseURL);

        // self-test
        await ff.exec(['-version']);
        console.log('[FFmpeg] self-test ok');
        instance = ff;
        return ff;
      } catch (e) {
        console.error('[FFmpeg] load failed from', baseURL, e);
        lastErr = e;
      }
    }
    throw lastErr ?? new Error('FFmpeg load failed (all sources)');
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
    const ff = await getFFmpeg();
    console.log('FFmpeg ready:', ff);
    await ff.exec(['-version']);
    console.log('FFmpeg version OK');
    alert('FFmpeg load + self-test succeeded');
  } catch (e: any) {
    console.error('FFmpeg test failed', e);
    alert('FFmpeg test failed: ' + (e?.message ?? e));
  }
}

# Axessible Editor (MediaBunny Integration)

The new premium video editor built on **MediaBunny** - a browser-based media processing library that enables video reading, editing, and encoding entirely in JavaScript.

## What is MediaBunny?

MediaBunny is like FFmpeg in the browser. It provides low-level APIs for:
- Reading media files (Input/BlobSource)
- Extracting frames (VideoSampleSink)
- Processing audio (AudioSampleSink)
- Creating new media (Output/Conversion)
- Format conversion and encoding

**MediaBunny does NOT provide:**
- Video editor UI components
- Timeline widgets
- Player controls

We build these ourselves using Canvas, React, and MediaBunny's APIs.

## Architecture

```
src/components/axessible-editor/
├── AxessibleEditor.tsx          # Main editor component
├── components/
│   ├── TimelineCanvas.tsx       # Custom timeline UI (TODO)
│   ├── CaptionOverlay.tsx       # Captions with CWI (TODO)
│   ├── EffectsPanel.tsx         # Video effects (TODO)
│   └── ExportDialog.tsx         # Export with MediaBunny Output (TODO)
└── hooks/
    ├── useMediaBunnyInput.ts    # Hook for Input management (TODO)
    └── useVideoPlayback.ts      # Playback state management (TODO)
```

## Current Implementation

### AxessibleEditor.tsx

**What it does:**

1. **Loads video from Supabase:**
   ```typescript
   // Fetch video metadata
   const { data: video } = await supabase
     .from('videos')
     .select('*')
     .eq('id', videoId)
     .single();

   // Fetch video file as blob
   const response = await fetch(videoUrl);
   const blob = await response.blob();
   ```

2. **Initializes MediaBunny Input:**
   ```typescript
   const input = new Input({
     formats: ALL_FORMATS,
     source: new BlobSource(blob),
   });

   const duration = await input.computeDuration();
   const videoTrack = await input.getPrimaryVideoTrack();
   ```

3. **Creates VideoSampleSink for frame extraction:**
   ```typescript
   const videoSink = new VideoSampleSink(videoTrack);
   
   // Get frame at specific time
   const sample = await videoSink.getSample(currentTime);
   
   // Draw to canvas
   sample.draw(ctx, 0, 0);
   ```

4. **Custom playback loop:**
   ```typescript
   // requestAnimationFrame loop
   const loop = async () => {
     const sample = await videoSink.getSample(currentTime);
     sample.draw(ctx, 0, 0);
     drawCaptionsAtTime(ctx, currentTime);
     
     animationFrameRef.current = requestAnimationFrame(loop);
   };
   ```

5. **Renders captions with CWI colors:**
   ```typescript
   const activeSegment = transcriptSegments.find(
     seg => seg.start_time <= currentTime && currentTime <= seg.end_time
   );
   
   // Draw caption with speaker color
   ctx.fillStyle = activeSegment.speaker_color;
   ctx.fillText(activeSegment.text, x, y);
   ```

## MediaBunny API Usage

### Reading Video Metadata

```typescript
import { Input, ALL_FORMATS, BlobSource } from 'mediabunny';

const input = new Input({
  formats: ALL_FORMATS,
  source: new BlobSource(videoBlob),
});

const duration = await input.computeDuration();
const videoTrack = await input.getPrimaryVideoTrack();

videoTrack.displayWidth;
videoTrack.displayHeight;
videoTrack.rotation;

// Estimate FPS
const stats = await videoTrack.computePacketStats(100);
const fps = stats.averagePacketRate;
```

### Extracting Video Frames

```typescript
import { VideoSampleSink } from 'mediabunny';

const sink = new VideoSampleSink(videoTrack);

// Get single frame
const sample = await sink.getSample(5.0); // at 5 seconds
sample.draw(ctx, 0, 0);

// Loop over all frames
for await (const sample of sink.samples(0, 30)) {
  // Process each frame in first 30 seconds
  sample.draw(ctx, 0, 0);
}
```

### Creating Thumbnails

```typescript
import { CanvasSink } from 'mediabunny';

const sink = new CanvasSink(videoTrack, {
  width: 320, // Resize thumbnails
});

const result = await sink.getCanvas(10); // at 10 seconds
result.canvas; // HTMLCanvasElement
```

### Exporting Video (TODO)

```typescript
import { Output, BufferTarget, Mp4OutputFormat } from 'mediabunny';

const output = new Output({
  format: new Mp4OutputFormat(),
  target: new BufferTarget(),
});

// Add video/audio tracks, apply effects, etc.
await output.start();
// ... add frames ...
await output.finalize();

const buffer = output.target.buffer; // Final MP4 file
```

## Data Flow

```
1. User navigates to /video/:id/edit
   ↓
2. AxessibleEditor fetches video from Supabase
   ├─ Video metadata (title, duration, storage_path)
   ├─ Transcript segments (for captions)
   └─ Characters (for CWI colors)
   ↓
3. Download video file as Blob
   ↓
4. Initialize MediaBunny Input
   ├─ Parse media format
   ├─ Extract video/audio tracks
   └─ Read metadata (dimensions, fps, duration)
   ↓
5. Create VideoSampleSink for frame extraction
   ↓
6. Render to Canvas in requestAnimationFrame loop
   ├─ Extract frame at currentTime
   ├─ Draw frame to canvas
   └─ Overlay captions with CWI colors
   ↓
7. User edits (TODO: effects, cuts, transitions)
   ↓
8. Export using MediaBunny Output API (TODO)
```

## Database Integration

### premium_projects
Stores editor project state:
- `video_id`: Link to original video
- `canvas_width/height/fps`: Canvas settings
- `total_duration`: Project duration
- `audio_settings`: Audio config

### transcript_segments
Loaded as captions:
- `text`: Caption text
- `start_time/end_time`: Display timing
- `speaker_color`: CWI color for speaker

### characters
Character/speaker info:
- `name`: Speaker name
- `color`: CWI color
- `voice_id`: For dubbing (future)

## Features

### ✅ Implemented
- Load video from Supabase storage
- Extract metadata with MediaBunny
- Canvas-based video player
- Custom playback controls
- Seeking via timeline
- Captions overlay with CWI colors
- Caption markers on timeline

### 🚧 In Progress
- None

### 📋 Planned
- [ ] Scene-based editing
- [ ] Video effects (brightness, contrast, filters)
- [ ] Audio waveform visualization
- [ ] Multi-track timeline
- [ ] Audio description overlay
- [ ] Sign language video positioning
- [ ] Cut/trim/splice operations
- [ ] Transitions between clips
- [ ] Export with MediaBunny Output API
- [ ] Template-based export presets
- [ ] Collaborative editing
- [ ] Undo/redo system
- [ ] Keyboard shortcuts
- [ ] Project versioning

## Export Process (Future)

Will use MediaBunny's Output API:

```typescript
import { Output, BufferTarget, Mp4OutputFormat, CanvasSource } from 'mediabunny';

// 1. Create output
const output = new Output({
  format: new Mp4OutputFormat({ fastStart: true }),
  target: new BufferTarget(),
});

// 2. Add video track from canvas
const canvasSource = new CanvasSource(canvas, {
  codec: 'avc',
  bitrate: QUALITY_HIGH,
});
output.addVideoTrack(canvasSource);

// 3. Render each frame
await output.start();
for (let time = 0; time < duration; time += 1/fps) {
  // Render frame with effects + captions
  await renderFrameAtTime(canvas, time);
  await canvasSource.add(time, 1/fps);
}
await output.finalize();

// 4. Upload to storage
const buffer = output.target.buffer;
const blob = new Blob([buffer], { type: 'video/mp4' });
// Upload to Supabase...
```

## Performance Considerations

- **Canvas rendering**: Uses `requestAnimationFrame` for smooth playback
- **Frame caching**: TODO - Cache recently accessed frames
- **Web Workers**: TODO - Offload processing to workers
- **Memory management**: TODO - Dispose of unused VideoSampleSink instances
- **Proxy videos**: TODO - Use lower-res proxy for editing, high-res for export

## Browser Requirements

MediaBunny requires:
- **ECMAScript 2021+** support
- Modern browser (Chrome, Edge, Firefox, Safari)
- WebAssembly support
- Canvas 2D API
- (Optional) Hardware acceleration for decoding

## Troubleshooting

**Video not loading:**
- Check browser console for errors
- Verify video file exists in Supabase storage
- Ensure CORS is configured for storage bucket
- Check if codec is supported (use canDecode())

**Playback is laggy:**
- Video decoding is CPU-intensive
- Try lower resolution proxy
- Reduce canvas size
- Use hardware acceleration if available

**Captions not showing:**
- Verify transcript_segments exist in database
- Check start_time/end_time ranges are valid
- Ensure speaker_color field is set

**Export fails (when implemented):**
- Check browser codec support
- Verify sufficient memory available
- Monitor console for MediaBunny errors

## Testing

Navigate to `/video/:id/edit` with any uploaded video (Standard+ subscription required).

**Expected behavior:**
1. Loading screen appears
2. Video metadata extracted
3. Canvas displays video frame
4. Play button starts playback
5. Timeline shows progress
6. Captions appear with CWI colors
7. Seeking works via timeline click

## Resources

- [MediaBunny Documentation](https://mediabunny.dev/docs)
- [MediaBunny Examples](https://mediabunny.dev/examples)
- [Web Codecs API](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)
- [Canvas 2D API](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)

# Axessible Editor (MediaBunny Integration)

This is the new premium video editor that integrates MediaBunny for professional video editing capabilities while maintaining all Axessible accessibility features.

## Architecture

```
PremiumVideoEditor (Route: /video/:id/edit)
  └─ Access Control & Subscription Gate
     └─ AxessibleEditor
        └─ MediaBunny Container
           ├─ Video Timeline
           ├─ Video Player
           ├─ Caption Tracks (CWI)
           └─ Effects & Transitions
```

## Components

### AxessibleEditor.tsx

Main component that:
1. Initializes MediaBunny video editor
2. Loads video from Supabase
3. Creates/loads premium_projects
4. Loads transcript segments as caption tracks with CWI colors
5. Provides UI controls (Save, Export, Back)

## Data Flow

```
1. Component mounts
   ↓
2. Initialize MediaBunny in container
   ↓
3. Load video data from Supabase
   ├─ videos table (video metadata + storage_path)
   ├─ transcript_segments table (captions with speaker colors)
   └─ characters table (speaker/character info)
   ↓
4. Create/load premium_project entry
   ↓
5. Add video to MediaBunny timeline
   ↓
6. Add transcript as caption tracks with CWI styling
   ↓
7. User can edit, save, export
```

## Database Schema

### premium_projects
- Stores project settings for MediaBunny editor
- Links to original video via `video_id`
- Contains canvas settings (width, height, fps)
- Tracks project state and metadata

### Integration with Existing Tables
- Uses `videos` table for video files
- Uses `transcript_segments` for captions with CWI
- Uses `characters` for speaker color management
- Uses `audio_descriptions` for accessibility features
- Uses `sign_language_clips` for ASL overlays

## MediaBunny API

MediaBunny provides:
- Professional video timeline
- Multi-track editing
- Effects and transitions
- Text/caption overlays
- Export capabilities

For full API documentation, see: https://mediabunny.dev/docs

## Future Enhancements

- [ ] Implement scene-based editing
- [ ] Add audio description overlay controls
- [ ] Add sign language video positioning
- [ ] Implement template system
- [ ] Add collaborative editing
- [ ] Implement version control
- [ ] Add AI-powered scene detection
- [ ] Export presets (YouTube, TikTok, etc.)

## Usage

```tsx
import { AxessibleEditor } from '@/components/axessible-editor/AxessibleEditor';

// In your route component
<AxessibleEditor videoId={videoId} />
```

## Testing

To test the editor:
1. Navigate to `/video/:id/edit` for any uploaded video
2. Ensure you have Standard or higher subscription
3. Video should load into MediaBunny timeline
4. Transcript should appear as caption tracks
5. Can play/pause and scrub timeline

## Troubleshooting

**MediaBunny not initializing:**
- Check browser console for errors
- Ensure modern browser (ES2021+ support)
- Check MediaBunny package version

**Video not loading:**
- Verify video has valid `storage_path` in database
- Check Supabase storage bucket permissions
- Verify video file exists in R2/Supabase storage

**Captions not appearing:**
- Ensure video has transcript_segments in database
- Check that segments have valid time ranges
- Verify speaker_color fields are set

## Performance

- MediaBunny uses WebGL for hardware acceleration
- Canvas rendering happens in requestAnimationFrame
- Large projects may require more memory
- Consider proxy videos for 4K+ content

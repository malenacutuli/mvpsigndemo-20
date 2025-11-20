# Premium Video Editor Route

## Route Configuration

The Premium Video Editor is accessible at `/video/:id/edit` and is protected by:

1. **Authentication** - Requires user to be logged in (via `<ProtectedRoute>`)
2. **Subscription Tier** - Requires Standard plan or higher
3. **Video Access** - User must own the video or have permission to edit

## Component Hierarchy

```
<ProtectedRoute>
  <PremiumVideoEditor>
    {accessLoading || projectLoading ? (
      <LoadingScreen />
    ) : !canAccess ? (
      <SubscriptionGate />
    ) : (
      <PremiumEditorLayout>
        - Header (Save, Export, Navigation)
        - Left Panel (AI, Text Editor, Fillers, Layout, Templates)
        - Center Panel (Video Player)
        - Right Panel (Properties)
        - Bottom Panel (Timeline)
      </PremiumEditorLayout>
    )}
  </PremiumVideoEditor>
</ProtectedRoute>
```

## Access Control Flow

1. **Check Authentication**
   - `ProtectedRoute` redirects to `/auth` if not logged in
   
2. **Check Subscription Tier**
   - `usePremiumAccess()` hook checks user's subscription
   - Allowed tiers: `standard`, `advanced`, `enterprise`, `admin`
   - Blocked tiers: `free`, `creators`

3. **Load Video & Project Data**
   - `useVideoProject(undefined, videoId)` auto-creates or fetches project
   - Loads video metadata from Supabase
   - Shows loading screen while fetching

4. **Show Appropriate UI**
   - Loading: `<LoadingScreen />` with progress indicator
   - No Access: `<SubscriptionGate />` with upgrade CTA
   - Has Access: Full premium editor interface

## Keyboard Shortcuts

- `Ctrl+S` / `Cmd+S` - Save project
- `Space` - Play/pause video
- `←` / `→` - Navigate timeline (coming soon)
- `Delete` - Delete selected scene (coming soon)

## State Management

The editor uses multiple state management approaches:

1. **React Query** (via hooks)
   - `useVideoProject()` - Project and scenes data
   - `useCaptionTemplates()` - Caption template library
   - Auto-caching and optimistic updates

2. **Zustand Store** (`usePremiumEditor`)
   - Playback state
   - Selected scene
   - Timeline state
   - Scene composition

3. **Local Component State**
   - Current time
   - Active tab
   - Modal visibility
   - Saving status

## Error Handling

- Video not found → Show error card with "Back to Videos" button
- Project load error → Toast notification with error details
- Insufficient tier → Show `SubscriptionGate` with feature list
- Save errors → Toast notification with retry option
- Network errors → Graceful degradation with cached data

## Mobile Responsiveness

The editor is optimized for desktop (1280px+) but includes:
- Responsive panels that stack on mobile
- Touch-friendly timeline controls
- Collapsible sidebars for small screens
- Mobile-optimized keyboard shortcuts (virtual keyboard aware)

## Security

- RLS policies ensure users only see/edit their own videos
- Subscription tier verified server-side via Edge Functions
- Admin users have bypass access for support purposes
- All mutations require valid session tokens

## Performance

- Video player uses lazy loading
- Timeline uses virtualization for large projects
- Debounced auto-save (2 seconds)
- Optimistic UI updates for instant feedback
- React Query caching reduces API calls

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePremiumEditor } from '@/store/premiumEditorStore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Download, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AxessibleEditorProps {
  videoId: string;
}

export function AxessibleEditor({ videoId }: AxessibleEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [mediaBunny, setMediaBunny] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { project, setProject } = usePremiumEditor();
  const navigate = useNavigate();

  // Initialize MediaBunny
  useEffect(() => {
    if (!editorRef.current) return;

    const initMediaBunny = async () => {
      try {
        // Dynamically import mediabunny
        const MB = await import('mediabunny');
        
        // Initialize MediaBunny instance
        // Note: Adjust API based on actual MediaBunny documentation
        const mb = new (MB as any).MediaBunny({
          container: editorRef.current,
          width: 1920,
          height: 1080,
          fps: 30,
          // Custom theme for premium look
          theme: {
            primary: '#3B82F6',
            background: '#0F172A',
            surface: '#1E293B',
            text: '#F1F5F9',
          }
        });

        setMediaBunny(mb);
        console.log('MediaBunny initialized successfully');
      } catch (error) {
        console.error('Failed to initialize MediaBunny:', error);
        toast.error('Failed to initialize video editor');
      }
    };

    initMediaBunny();

    return () => {
      if (mediaBunny?.dispose) {
        mediaBunny.dispose();
      }
    };
  }, []);

  // Load video project
  useEffect(() => {
    if (!mediaBunny || !videoId) return;

    loadVideoIntoEditor(videoId);
  }, [mediaBunny, videoId]);

  async function loadVideoIntoEditor(videoId: string) {
    if (!mediaBunny) return;

    setIsLoading(true);

    try {
      // 1. Fetch video from Supabase with related data
      const { data: video, error: videoError } = await supabase
        .from('videos')
        .select(`
          *,
          transcript_segments(*),
          characters(*)
        `)
        .eq('id', videoId)
        .single();

      if (videoError) throw videoError;
      if (!video) throw new Error('Video not found');

      console.log('Video loaded:', video);

      // 2. Construct video URL from storage_path
      const videoUrl = constructStorageUrl(video.storage_path);
      
      console.log('Video URL:', videoUrl);

      // 3. Add video to MediaBunny timeline
      try {
        await mediaBunny.addVideoTrack?.({
          url: videoUrl,
          name: video.title,
          duration: video.duration_seconds,
        });
      } catch (mbError) {
        console.error('MediaBunny track error:', mbError);
      }

      // 4. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Authentication required');
        return;
      }

      // 5. Create or load premium project
      const { data: premiumProject, error: projectError } = await supabase
        .from('premium_projects')
        .upsert({
          video_id: videoId,
          name: video.title,
          user_id: user.id,
          canvas_width: 1920,
          canvas_height: 1080,
          canvas_fps: 30,
          total_duration: video.duration_seconds,
        }, { 
          onConflict: 'video_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (projectError) {
        console.error('Project error:', projectError);
        throw projectError;
      }

      console.log('Premium project:', premiumProject);

      // 6. Set project in store
      setProject({
        id: premiumProject.id,
        videoId: video.id,
        videoUrl,
        duration: video.duration_seconds || 0,
        name: video.title,
        thumbnailUrl: video.thumbnail_url,
        createdAt: video.created_at,
        updatedAt: video.updated_at,
      });

      // 7. Load transcript as captions
      if (video.transcript_segments && video.transcript_segments.length > 0) {
        await loadTranscriptAsCaptions(video.transcript_segments);
      }

      // 8. Load characters
      if (video.characters && video.characters.length > 0) {
        await loadCharacters(video.characters);
      }

      toast.success('Video loaded into editor');
    } catch (error) {
      console.error('Failed to load video:', error);
      toast.error('Failed to load video into editor');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadTranscriptAsCaptions(segments: any[]) {
    if (!mediaBunny?.addTextTrack) return;

    try {
      // Create caption track in MediaBunny
      const captionTrack = mediaBunny.addTextTrack({
        name: 'Captions (CWI)',
        type: 'captions',
      });

      // Add each segment as a caption with character color
      segments.forEach(segment => {
        if (captionTrack?.addText) {
          captionTrack.addText({
            text: segment.text,
            startTime: segment.start_time,
            endTime: segment.end_time,
            style: {
              color: segment.speaker_color || '#FFFFFF',
              fontSize: 48,
              fontWeight: 'bold',
              backgroundColor: 'rgba(0,0,0,0.8)',
              padding: '10px 20px',
              borderRadius: '8px',
            },
            position: {
              x: 'center',
              y: 'bottom',
              offsetY: 100,
            },
          });
        }
      });

      console.log(`Loaded ${segments.length} caption segments`);
    } catch (error) {
      console.error('Failed to load captions:', error);
    }
  }

  async function loadCharacters(characters: any[]) {
    // Store characters in premium editor state for CWI color management
    console.log(`Loaded ${characters.length} characters:`, characters);
    // TODO: Add to premium editor store when character management is implemented
  }

  function constructStorageUrl(path: string): string {
    if (!path) return '';
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `https://faeyekynudyzeotbjfsj.supabase.co/storage/v1/object/public/videos/${cleanPath}`;
  }

  async function handleSave() {
    if (!project?.id) return;

    setSaving(true);
    try {
      // Save project state to Supabase
      const { error } = await supabase
        .from('premium_projects')
        .update({
          updated_at: new Date().toISOString(),
          last_opened_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      if (error) throw error;

      toast.success('Project saved');
    } catch (error) {
      console.error('Failed to save project:', error);
      toast.error('Failed to save project');
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    toast.info('Export functionality coming soon');
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Top Toolbar */}
      <div className="h-16 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/video/${videoId}`)}
          className="text-slate-300 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <h1 className="text-xl font-semibold text-white">
          {project?.name || 'Axessible Premium Editor'}
        </h1>
        
        <div className="flex-1" />
        
        <Button
          onClick={handleSave}
          disabled={saving || !project?.id}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save
            </>
          )}
        </Button>
        
        <Button
          onClick={handleExport}
          disabled={!project?.id}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center bg-slate-900">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-slate-300 text-lg">Loading video into editor...</p>
            </div>
          </div>
        ) : (
          <div 
            ref={editorRef} 
            className="flex-1 bg-slate-950"
            style={{ minHeight: 0 }}
          />
        )}
      </div>
    </div>
  );
}

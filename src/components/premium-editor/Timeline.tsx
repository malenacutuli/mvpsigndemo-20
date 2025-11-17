import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ZoomIn, ZoomOut, Palette } from 'lucide-react';
import { useVideoProject } from '@/hooks/useVideoProject';
import { useSubscription } from '@/hooks/useSubscription';
import { CaptionTemplateGallery } from './CaptionTemplateGallery';

interface TimelineProps {
  videoId: string;
}

export function Timeline({ videoId }: TimelineProps) {
  const { project, scenes, isLoading } = useVideoProject(videoId);
  const { subscription_tier } = useSubscription();
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);

  if (isLoading) {
    return <div>Loading timeline...</div>;
  }

  // Calculate total duration from scenes
  const totalDuration = scenes.length > 0 
    ? Math.max(...scenes.map(s => (s.end_time || 0))) 
    : 0;
  const pixelsPerSecond = 100 / 10; // 100px per 10 seconds

  return (
    <div className="space-y-4">
      {/* Timeline Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-light">Timeline</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowTemplateGallery(true)}>
            <Palette className="w-4 h-4 mr-2" />
            Caption Templates
          </Button>
          <Button variant="outline" size="sm">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm">
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Timeline Canvas */}
      <Card className="p-4">
        {scenes.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <p className="text-muted-foreground">
              Add your first scene to start editing
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Scene
            </Button>
          </div>
        ) : (
          <div className="relative h-24 bg-muted/20 rounded">
            {/* Time markers */}
            <div className="flex text-xs text-muted-foreground mb-2">
              {Array.from({ length: Math.ceil(totalDuration / 10) }).map((_, i) => (
                <div key={i} style={{ width: '100px' }}>
                  {i}:00
                </div>
              ))}
            </div>
            
            {/* Scene blocks */}
            {scenes.map(scene => {
              const duration = (scene.end_time || 0) - (scene.start_time || 0);
              const startPos = (scene.start_time || 0) * pixelsPerSecond;
              return (
                <div
                  key={scene.id}
                  className="absolute h-16 bg-primary/20 border-2 border-primary rounded"
                  style={{
                    left: `${startPos}px`,
                    width: `${duration * pixelsPerSecond}px`
                  }}
                >
                  <div className="p-1 text-xs truncate">
                    {scene.scene_name || `Scene ${scene.scene_index + 1}`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Caption Template Gallery */}
      {project && (
        <CaptionTemplateGallery
          open={showTemplateGallery}
          onOpenChange={setShowTemplateGallery}
          projectId={project.id}
          premiumVideoId={videoId}
          userTier={subscription_tier || 'free'}
        />
      )}
    </div>
  );
}

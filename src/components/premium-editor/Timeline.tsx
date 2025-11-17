import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ZoomIn, ZoomOut } from 'lucide-react';
import { useVideoProject } from '@/hooks/useVideoProject';
import { Skeleton } from '@/components/ui/skeleton';

interface TimelineProps {
  videoId: string;
}

export function Timeline({ videoId }: TimelineProps) {
  const { project, scenes, isLoading } = useVideoProject(videoId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Card className="p-4">
          <Skeleton className="h-24 w-full" />
        </Card>
      </div>
    );
  }

  const totalDuration = project?.duration_seconds || 0;
  const pixelsPerSecond = 100 / 10; // 100px per 10 seconds

  return (
    <div className="space-y-4">
      {/* Timeline Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-light">Timeline</h2>
        <div className="flex gap-2">
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
                  {Math.floor(i / 6)}:{String((i % 6) * 10).padStart(2, '0')}
                </div>
              ))}
            </div>
            
            {/* Scene blocks */}
            {scenes.map(scene => (
              <div
                key={scene.id}
                className="absolute h-16 bg-primary/20 border-2 border-primary rounded cursor-pointer hover:bg-primary/30 transition-colors"
                style={{
                  left: `${scene.timeline_start * pixelsPerSecond}px`,
                  width: `${scene.timeline_duration * pixelsPerSecond}px`
                }}
              >
                <div className="p-1 text-xs truncate">
                  Scene {scene.scene_index + 1}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

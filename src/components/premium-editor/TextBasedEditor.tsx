import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Trash2, Undo2, Scissors } from 'lucide-react';
import { toast } from 'sonner';

interface TextBasedEditorProps {
  videoId: string;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function TextBasedEditor({ videoId }: TextBasedEditorProps) {
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<Set<string>>(new Set());
  const [deletedSegmentIds, setDeletedSegmentIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: segments = [] } = useQuery({
    queryKey: ['transcriptSegments', videoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transcript_segments_clean')
        .select('*')
        .eq('video_id', videoId)
        .order('idx');

      if (error) throw error;
      return data;
    }
  });

  const markAsDeleted = (segmentIds: string[]) => {
    setDeletedSegmentIds(prev => {
      const newSet = new Set(prev);
      segmentIds.forEach(id => newSet.add(id));
      return newSet;
    });
    setSelectedSegmentIds(new Set());
    
    toast.success('Segments Marked for Deletion', {
      description: 'Click "Apply Edits" to rebuild the video'
    });
  };

  const restoreSegment = (segmentId: string) => {
    setDeletedSegmentIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(segmentId);
      return newSet;
    });
    
    toast.success('Segment Restored', {
      description: 'The segment has been restored to the timeline'
    });
  };

  const activeSegments = segments.filter(s => !deletedSegmentIds.has(s.id));
  const deletedSegments = segments.filter(s => deletedSegmentIds.has(s.id));

  const totalDuration = activeSegments.reduce(
    (acc, seg) => acc + (seg.end_time - seg.start_time),
    0
  );

  const handleBulkDelete = () => {
    if (selectedSegmentIds.size === 0) return;
    markAsDeleted(Array.from(selectedSegmentIds));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Scissors className="w-5 h-5" />
            Text-Based Video Editing
          </h3>
          <p className="text-sm text-muted-foreground">
            Delete transcript segments to automatically trim the video
          </p>
        </div>
        <div className="text-right">
          <Badge variant="secondary" className="mb-2">
            {activeSegments.length} segments
          </Badge>
          <p className="text-sm text-muted-foreground">
            Duration: {formatTime(totalDuration)}
          </p>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedSegmentIds.size > 0 && (
        <Card className="p-4 bg-primary/5 border-primary">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedSegmentIds.size} segments selected
            </span>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleBulkDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </Button>
          </div>
        </Card>
      )}

      {/* Active Segments */}
      <Card className="p-4 max-h-96 overflow-y-auto">
        <div className="space-y-2">
          {activeSegments.map((segment) => {
            const isSelected = selectedSegmentIds.has(segment.id);

            return (
              <div
                key={segment.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? 'border-destructive bg-destructive/5'
                    : 'border-transparent hover:bg-muted'
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => {
                    const newSet = new Set(selectedSegmentIds);
                    if (checked) {
                      newSet.add(segment.id);
                    } else {
                      newSet.delete(segment.id);
                    }
                    setSelectedSegmentIds(newSet);
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">
                      {formatTime(segment.start_time)} - {formatTime(segment.end_time)}
                    </span>
                    {segment.speaker && (
                      <Badge variant="outline" className="text-xs">
                        {segment.speaker}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm">{segment.text}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAsDeleted([segment.id])}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Deleted Segments */}
      {deletedSegments.length > 0 && (
        <Card className="p-4 bg-muted/50">
          <h4 className="font-medium mb-3 text-sm">
            Deleted Segments ({deletedSegments.length})
          </h4>
          <div className="space-y-2">
            {deletedSegments.map((segment) => (
              <div
                key={segment.id}
                className="flex items-center justify-between p-2 rounded bg-background/50"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-mono text-muted-foreground">
                    {formatTime(segment.start_time)} - {formatTime(segment.end_time)}
                  </span>
                  <p className="text-sm line-clamp-1 opacity-50">{segment.text}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => restoreSegment(segment.id)}
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Apply Button (disabled for MVP) */}
      <Card className="p-4 bg-muted/30">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Video rebuild feature coming soon (Week 3)
          </p>
          <Button disabled>
            Apply Edits & Rebuild Video
          </Button>
        </div>
      </Card>
    </div>
  );
}

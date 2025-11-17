import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useMultiSegmentStitching } from '@/hooks/useMultiSegmentStitching';
import { Scissors, Sparkles } from 'lucide-react';

interface MultiSegmentSelectorProps {
  videoId: string;
  onGenerate: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function MultiSegmentSelector({
  videoId,
  onGenerate
}: MultiSegmentSelectorProps) {
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

  const {
    selectedSegments,
    totalDuration,
    toggleSegment,
    clearSelection,
  } = useMultiSegmentStitching(videoId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Scissors className="w-5 h-5" />
            Select Segments to Combine
          </h3>
          <p className="text-sm text-muted-foreground">
            Choose multiple transcript segments to create a highlight reel
          </p>
        </div>
        {selectedSegments.length > 0 && (
          <div className="text-right">
            <Badge variant="secondary" className="mb-2">
              {selectedSegments.length} segments selected
            </Badge>
            <p className="text-sm text-muted-foreground">
              Total duration: {formatTime(totalDuration)}
            </p>
          </div>
        )}
      </div>

      {/* Segment List */}
      <Card className="p-4 max-h-96 overflow-y-auto">
        <div className="space-y-2">
          {segments.map((segment) => {
            const isSelected = selectedSegments.some(
              s => s.segmentId === segment.id
            );

            return (
              <div
                key={segment.id}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent hover:bg-muted'
                }`}
                onClick={() =>
                  toggleSegment({
                    segmentId: segment.id,
                    startTime: segment.start_time,
                    endTime: segment.end_time,
                    text: segment.text
                  })
                }
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() =>
                    toggleSegment({
                      segmentId: segment.id,
                      startTime: segment.start_time,
                      endTime: segment.end_time,
                      text: segment.text
                    })
                  }
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
                  <p className="text-sm line-clamp-2">{segment.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Actions */}
      {selectedSegments.length > 0 && (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={clearSelection}>
            Clear Selection
          </Button>
          <Button onClick={onGenerate}>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Clip ({selectedSegments.length} segments)
          </Button>
        </div>
      )}
    </div>
  );
}

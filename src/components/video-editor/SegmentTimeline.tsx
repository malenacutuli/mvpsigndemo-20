import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface Segment {
  id: string;
  startTime: number;
  endTime: number;
  speaker: string;
  speakerColor: string;
  text: string;
  isIncluded: boolean;
}

interface SegmentTimelineProps {
  segments: Segment[];
  selectedSegments: Set<string>;
  onToggleSegment: (segmentId: string) => void;
  onToggleSpeaker: (speaker: string) => void;
}

export function SegmentTimeline({
  segments,
  selectedSegments,
  onToggleSegment,
  onToggleSpeaker
}: SegmentTimelineProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const speakers = Array.from(new Set(segments.map(s => s.speaker)));

  const getSelectedDuration = () => {
    return segments
      .filter(s => selectedSegments.has(s.id))
      .reduce((sum, s) => sum + (s.endTime - s.startTime), 0);
  };

  return (
    <div className="space-y-4">
      {/* Speaker Filter */}
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-3">Filter by Speaker</h3>
        <div className="flex flex-wrap gap-2">
          {speakers.map(speaker => {
            const speakerSegments = segments.filter(s => s.speaker === speaker);
            const allSelected = speakerSegments.every(s => selectedSegments.has(s.id));
            const someSelected = speakerSegments.some(s => selectedSegments.has(s.id));
            const color = speakerSegments[0]?.speakerColor || '#FFFFFF';

            return (
              <Badge
                key={speaker}
                variant={allSelected ? "default" : "outline"}
                className="cursor-pointer transition-all"
                style={{
                  backgroundColor: allSelected ? color : 'transparent',
                  borderColor: color,
                  color: allSelected ? '#000' : color
                }}
                onClick={() => onToggleSpeaker(speaker)}
              >
                <Checkbox
                  checked={allSelected}
                  className="mr-2"
                  style={{ opacity: someSelected && !allSelected ? 0.5 : 1 }}
                />
                {speaker} ({speakerSegments.length})
              </Badge>
            );
          })}
        </div>
      </Card>

      {/* Segment List */}
      <Card className="p-4 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium">
            Timeline Segments ({selectedSegments.size}/{segments.length})
          </h3>
          <div className="text-sm text-muted-foreground">
            Selected Duration: {formatTime(getSelectedDuration())}
          </div>
        </div>

        <div className="space-y-2">
          {segments.map((segment, index) => {
            const isSelected = selectedSegments.has(segment.id);

            return (
              <div
                key={segment.id}
                className={`
                  flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer
                  ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                `}
                onClick={() => onToggleSegment(segment.id)}
              >
                <Checkbox
                  checked={isSelected}
                  className="mt-1"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      #{index + 1}
                    </span>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: segment.speakerColor,
                        color: segment.speakerColor
                      }}
                    >
                      {segment.speaker}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                      <span className="ml-2">
                        ({(segment.endTime - segment.startTime).toFixed(1)}s)
                      </span>
                    </span>
                  </div>

                  <p className="text-sm line-clamp-2">
                    {segment.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

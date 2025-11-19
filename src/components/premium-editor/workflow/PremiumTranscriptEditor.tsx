import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { usePremiumTranscript } from '@/hooks/premium-editor/usePremiumTranscript';
import { PremiumTranscript } from '@/types/premium-transcript';
import { Search, Trash2, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumTranscriptEditorProps {
  projectId: string;
  currentTime: number;
  onSeekToTime: (time: number) => void;
  onTranscriptChange?: () => void;
  characters?: any[];
}

export function PremiumTranscriptEditor({
  projectId,
  currentTime,
  onSeekToTime,
  onTranscriptChange,
  characters = []
}: PremiumTranscriptEditorProps) {
  const {
    segments,
    loading,
    saving,
    selectedSegmentIds,
    searchQuery,
    setSearchQuery,
    setSelectedSegmentIds,
    updateSegmentText,
    deleteSegment,
    mergeSegments,
    assignCharacter
  } = usePremiumTranscript({ projectId, onTranscriptChange });

  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    const currentSegment = segments.find(
      seg => currentTime >= seg.start_time && currentTime <= seg.end_time
    );
    
    if (currentSegment) {
      const element = document.getElementById(`transcript-segment-${currentSegment.id}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTime, segments]);

  const handleStartEdit = (segment: PremiumTranscript) => {
    setEditingSegmentId(segment.id);
    setEditText(segment.text);
  };

  const handleSaveEdit = async () => {
    if (editingSegmentId) {
      await updateSegmentText(editingSegmentId, editText);
      setEditingSegmentId(null);
    }
  };

  const handleSegmentClick = (segment: PremiumTranscript, e: React.MouseEvent) => {
    if (e.shiftKey) {
      setSelectedSegmentIds(prev =>
        prev.includes(segment.id)
          ? prev.filter(id => id !== segment.id)
          : [...prev, segment.id]
      );
    } else {
      setSelectedSegmentIds([segment.id]);
      onSeekToTime(segment.start_time);
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 space-y-3">
        <CardTitle className="flex items-center justify-between">
          <span>Transcript</span>
          <Badge variant="secondary">{segments.length} segments</Badge>
        </CardTitle>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcript..."
            className="pl-9"
          />
        </div>

        {selectedSegmentIds.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {selectedSegmentIds.length} selected
            </Badge>
            
            {selectedSegmentIds.length > 1 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => mergeSegments(selectedSegmentIds)}
              >
                Merge
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <ScrollArea className="flex-1">
        <CardContent className="space-y-2 pt-0">
          {segments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-2">No transcript available</p>
              <p className="text-sm text-muted-foreground">Generate a transcript to get started</p>
            </div>
          ) : (
            segments.map((segment) => (
              <div
                key={segment.id}
                id={`transcript-segment-${segment.id}`}
                className={cn(
                  'group rounded-lg border-2 p-3 transition-all cursor-pointer',
                  currentTime >= segment.start_time && currentTime <= segment.end_time && 'border-primary bg-primary/5',
                  selectedSegmentIds.includes(segment.id) && 'border-primary bg-primary/5',
                  !selectedSegmentIds.includes(segment.id) && (currentTime < segment.start_time || currentTime > segment.end_time) && 'border-border hover:border-muted-foreground'
                )}
                onClick={(e) => handleSegmentClick(segment, e)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {segment.character_color && (
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: segment.character_color }}
                      />
                    )}
                    <span className="text-xs font-mono text-muted-foreground">
                      {formatTime(segment.start_time)}
                    </span>
                    {segment.speaker && (
                      <span className="text-xs font-medium text-foreground">
                        {segment.speaker}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {editingSegmentId === segment.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveEdit();
                          }}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSegmentId(null);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(segment);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSegment(segment.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {editingSegmentId === segment.id ? (
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full p-2 border rounded resize-none bg-background"
                    rows={3}
                    autoFocus
                  />
                ) : (
                  <p className="text-sm leading-relaxed text-foreground">{segment.text}</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </ScrollArea>

      {saving && (
        <div className="flex-shrink-0 bg-primary/10 border-t p-2 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm text-primary">Saving...</span>
        </div>
      )}
    </Card>
  );
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '0:00.0';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
}

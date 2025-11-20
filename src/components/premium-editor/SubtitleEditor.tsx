import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileText, 
  Download, 
  Plus, 
  Trash2, 
  Upload,
  Play,
  Edit2
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  type SubtitleTrack, 
  type SubtitleCue,
  convertToWebVTT,
  parseWebVTT,
  downloadWebVTT 
} from '@/lib/subtitleExtractor';

interface SubtitleEditorProps {
  tracks: SubtitleTrack[];
  videoDuration?: number;
  onTracksChange?: (tracks: SubtitleTrack[]) => void;
}

export function SubtitleEditor({ tracks: initialTracks, videoDuration = 0, onTracksChange }: SubtitleEditorProps) {
  const [tracks, setTracks] = useState<SubtitleTrack[]>(initialTracks);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const [editingCueIndex, setEditingCueIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editStart, setEditStart] = useState('0');
  const [editEnd, setEditEnd] = useState('0');

  const selectedTrack = tracks[selectedTrackIndex];

  const handleAddTrack = () => {
    const newTrack: SubtitleTrack = {
      language: 'en',
      isDefault: tracks.length === 0,
      isForced: false,
      cues: []
    };
    const newTracks = [...tracks, newTrack];
    setTracks(newTracks);
    setSelectedTrackIndex(newTracks.length - 1);
    onTracksChange?.(newTracks);
    toast.success('New subtitle track added');
  };

  const handleImportVTT = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.vtt';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const content = await file.text();
        const track = parseWebVTT(content);
        const newTracks = [...tracks, track];
        setTracks(newTracks);
        setSelectedTrackIndex(newTracks.length - 1);
        onTracksChange?.(newTracks);
        toast.success(`Imported ${track.cues.length} subtitles`);
      } catch (error: any) {
        console.error('Failed to import VTT:', error);
        toast.error('Failed to import subtitles');
      }
    };
    
    input.click();
  };

  const handleExportVTT = () => {
    if (!selectedTrack) {
      toast.error('No track selected');
      return;
    }

    downloadWebVTT(selectedTrack, `subtitles-${selectedTrack.language}.vtt`);
    toast.success('Subtitles exported');
  };

  const handleAddCue = () => {
    if (!selectedTrack) return;

    const lastCue = selectedTrack.cues[selectedTrack.cues.length - 1];
    const startTime = lastCue ? lastCue.endTime + 0.5 : 0;
    const endTime = Math.min(startTime + 3, videoDuration);

    const newCue: SubtitleCue = {
      id: `cue-${Date.now()}`,
      startTime,
      endTime,
      text: 'New subtitle'
    };

    const newTracks = [...tracks];
    newTracks[selectedTrackIndex].cues.push(newCue);
    setTracks(newTracks);
    onTracksChange?.(newTracks);
  };

  const handleEditCue = (index: number) => {
    const cue = selectedTrack.cues[index];
    setEditingCueIndex(index);
    setEditText(cue.text);
    setEditStart(cue.startTime.toFixed(2));
    setEditEnd(cue.endTime.toFixed(2));
  };

  const handleSaveCue = () => {
    if (editingCueIndex === null || !selectedTrack) return;

    const newTracks = [...tracks];
    newTracks[selectedTrackIndex].cues[editingCueIndex] = {
      ...selectedTrack.cues[editingCueIndex],
      text: editText,
      startTime: parseFloat(editStart),
      endTime: parseFloat(editEnd)
    };
    
    setTracks(newTracks);
    setEditingCueIndex(null);
    onTracksChange?.(newTracks);
    toast.success('Subtitle updated');
  };

  const handleDeleteCue = (index: number) => {
    if (!selectedTrack) return;

    const newTracks = [...tracks];
    newTracks[selectedTrackIndex].cues.splice(index, 1);
    setTracks(newTracks);
    onTracksChange?.(newTracks);
    toast.success('Subtitle deleted');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Subtitle Tracks
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleImportVTT}>
                <Upload className="w-4 h-4 mr-1" />
                Import VTT
              </Button>
              <Button size="sm" variant="outline" onClick={handleAddTrack}>
                <Plus className="w-4 h-4 mr-1" />
                New Track
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Edit and export subtitle tracks in WebVTT format
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tracks.length === 0 ? (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                No subtitle tracks found. Add a new track or import a WebVTT file.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Track Selector */}
              <div className="flex items-center gap-2">
                <Select 
                  value={selectedTrackIndex.toString()} 
                  onValueChange={(value) => setSelectedTrackIndex(parseInt(value))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tracks.map((track, idx) => (
                      <SelectItem key={idx} value={idx.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{track.language || 'Unknown'}</span>
                          {track.isDefault && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            ({track.cues.length} cues)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={handleExportVTT}>
                  <Download className="w-4 h-4" />
                </Button>
              </div>

              {/* Subtitle List */}
              {selectedTrack && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      Subtitles ({selectedTrack.cues.length})
                    </div>
                    <Button size="sm" onClick={handleAddCue}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Subtitle
                    </Button>
                  </div>

                  <ScrollArea className="h-[400px] rounded-lg border">
                    <div className="p-4 space-y-2">
                      {selectedTrack.cues.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-8">
                          No subtitles in this track
                        </div>
                      ) : (
                        selectedTrack.cues.map((cue, index) => (
                          <Card key={cue.id} className="p-3">
                            {editingCueIndex === index ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs text-muted-foreground">Start (s)</label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editStart}
                                      onChange={(e) => setEditStart(e.target.value)}
                                      className="text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">End (s)</label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editEnd}
                                      onChange={(e) => setEditEnd(e.target.value)}
                                      className="text-sm"
                                    />
                                  </div>
                                </div>
                                <Textarea
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  className="text-sm"
                                  rows={3}
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={handleSaveCue}>
                                    Save
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => setEditingCueIndex(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="text-xs text-muted-foreground mb-1">
                                      {cue.startTime.toFixed(2)}s → {cue.endTime.toFixed(2)}s
                                    </div>
                                    <div className="text-sm whitespace-pre-wrap">{cue.text}</div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEditCue(index)}
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteCue(index)}
                                    >
                                      <Trash2 className="w-3 h-3 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              </>
                            )}
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

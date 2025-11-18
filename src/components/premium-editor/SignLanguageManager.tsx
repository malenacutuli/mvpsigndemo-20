import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { 
  Hand, Upload, Play, Trash2, Save
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SignLanguageClip {
  id: string;
  videoId: string;
  clipUrl: string;
  startTime: number;
  endTime: number;
  interpreter: string;
  language: 'ASL' | 'ISL' | 'BSL' | 'LSE' | 'Other';
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size: 'small' | 'medium' | 'large';
  opacity: number;
  borderRadius: number;
  hasBorder: boolean;
  syncedWithCharacter?: string;
}

interface Character {
  id: string;
  name: string;
  color: string;
}

interface SignLanguageManagerProps {
  videoId: string;
  videoUrl: string;
  currentTime: number;
  characters: Character[];
  onClipsUpdated?: (clips: SignLanguageClip[]) => void;
}

// Position presets
const POSITIONS = [
  { value: 'bottom-right' as const, label: 'Bottom Right', x: 75, y: 75 },
  { value: 'bottom-left' as const, label: 'Bottom Left', x: 5, y: 75 },
  { value: 'top-right' as const, label: 'Top Right', x: 75, y: 5 },
  { value: 'top-left' as const, label: 'Top Left', x: 5, y: 5 },
];

// Size presets (% of video width)
const SIZES = {
  small: 15,
  medium: 25,
  large: 35
};

const SIGN_LANGUAGES = [
  { code: 'ASL' as const, name: 'American Sign Language' },
  { code: 'ISL' as const, name: 'International Sign Language' },
  { code: 'BSL' as const, name: 'British Sign Language' },
  { code: 'LSE' as const, name: 'Spanish Sign Language' },
  { code: 'Other' as const, name: 'Other' }
];

export function SignLanguageManager({
  videoId,
  videoUrl,
  currentTime,
  characters,
  onClipsUpdated
}: SignLanguageManagerProps) {
  const [clips, setClips] = useState<SignLanguageClip[]>([]);
  const [selectedClip, setSelectedClip] = useState<SignLanguageClip | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    loadSignLanguageClips();
  }, [videoId]);

  const loadSignLanguageClips = async () => {
    try {
      // Note: This requires the sign_language_clips table to exist
      const { data, error } = await supabase
        .from('sign_language_clips')
        .select('*')
        .eq('video_id', videoId)
        .order('start_time_ms', { ascending: true });

      if (error) {
        console.warn('Sign language clips table may not exist yet:', error);
        return;
      }

      const loadedClips: SignLanguageClip[] = (data || []).map(d => ({
        id: d.id,
        videoId: d.video_id,
        clipUrl: d.clip_url,
        startTime: d.start_time_ms / 1000,
        endTime: d.end_time_ms / 1000,
        interpreter: d.interpreter || 'Unknown',
        language: (d.language || 'ASL') as SignLanguageClip['language'],
        position: (d.position || 'bottom-right') as SignLanguageClip['position'],
        size: (d.size || 'medium') as SignLanguageClip['size'],
        opacity: d.opacity ?? 1.0,
        borderRadius: d.border_radius ?? 8,
        hasBorder: d.has_border ?? true,
        syncedWithCharacter: d.synced_with_character
      }));

      setClips(loadedClips);
      onClipsUpdated?.(loadedClips);

    } catch (error) {
      console.error('Failed to load sign language clips:', error);
    }
  };

  const uploadSignLanguageClip = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error('Please upload a video file');
      return;
    }

    setIsUploading(true);
    try {
      // Upload to Supabase Storage
      const fileName = `${videoId}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('sign-language-clips')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('sign-language-clips')
        .getPublicUrl(fileName);

      // Create database entry
      const newClip: SignLanguageClip = {
        id: '', // Will be set after insert
        videoId,
        clipUrl: urlData.publicUrl,
        startTime: currentTime,
        endTime: currentTime + 10,
        interpreter: '',
        language: 'ASL',
        position: 'bottom-right',
        size: 'medium',
        opacity: 1.0,
        borderRadius: 8,
        hasBorder: true
      };

      const { data: dbData, error: dbError } = await supabase
        .from('sign_language_clips')
        .insert({
          video_id: newClip.videoId,
          clip_url: newClip.clipUrl,
          start_time_ms: Math.round(newClip.startTime * 1000),
          end_time_ms: Math.round(newClip.endTime * 1000),
          interpreter: newClip.interpreter,
          language: newClip.language,
          position: newClip.position,
          size: newClip.size,
          opacity: newClip.opacity,
          border_radius: newClip.borderRadius,
          has_border: newClip.hasBorder,
          transcript_segment_id: null
        })
        .select()
        .single();

      if (dbError) throw dbError;

      const savedClip: SignLanguageClip = {
        ...newClip,
        id: dbData.id
      };

      setClips(prev => [...prev, savedClip].sort((a, b) => a.startTime - b.startTime));
      setSelectedClip(savedClip);
      onClipsUpdated?.([...clips, savedClip]);
      
      toast.success('Sign language clip uploaded');

    } catch (error) {
      console.error('Failed to upload clip:', error);
      toast.error('Failed to upload clip');
    } finally {
      setIsUploading(false);
    }
  };

  const updateSignLanguageClip = async (clip: SignLanguageClip) => {
    try {
      const { error } = await supabase
        .from('sign_language_clips')
        .update({
          start_time_ms: Math.round(clip.startTime * 1000),
          end_time_ms: Math.round(clip.endTime * 1000),
          interpreter: clip.interpreter,
          language: clip.language,
          position: clip.position,
          size: clip.size,
          opacity: clip.opacity,
          border_radius: clip.borderRadius,
          has_border: clip.hasBorder,
          synced_with_character: clip.syncedWithCharacter
        })
        .eq('id', clip.id);

      if (error) throw error;

      setClips(prev => prev.map(c => c.id === clip.id ? clip : c));
      onClipsUpdated?.(clips.map(c => c.id === clip.id ? clip : c));
      
      toast.success('Sign language clip updated');

    } catch (error) {
      console.error('Failed to update clip:', error);
      toast.error('Failed to update clip');
    }
  };

  const deleteSignLanguageClip = async (clipId: string) => {
    try {
      const clip = clips.find(c => c.id === clipId);
      if (!clip) return;

      // Delete from storage
      const urlPath = new URL(clip.clipUrl).pathname;
      const filePath = urlPath.split('/sign-language-clips/')[1];
      
      if (filePath) {
        await supabase.storage
          .from('sign-language-clips')
          .remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('sign_language_clips')
        .delete()
        .eq('id', clipId);

      if (error) throw error;

      setClips(prev => prev.filter(c => c.id !== clipId));
      if (selectedClip?.id === clipId) setSelectedClip(null);
      onClipsUpdated?.(clips.filter(c => c.id !== clipId));
      
      toast.success('Sign language clip deleted');

    } catch (error) {
      console.error('Failed to delete clip:', error);
      toast.error('Failed to delete clip');
    }
  };

  const getClipAtTime = (time: number): SignLanguageClip | null => {
    return clips.find(c => time >= c.startTime && time < c.endTime) || null;
  };

  const getPositionStyle = (clip: SignLanguageClip) => {
    const sizePercent = SIZES[clip.size];
    const position = POSITIONS.find(p => p.value === clip.position);
    
    return {
      width: `${sizePercent}%`,
      opacity: clip.opacity,
      borderRadius: `${clip.borderRadius}px`,
      border: clip.hasBorder ? `3px solid ${getCharacterColor(clip.syncedWithCharacter)}` : 'none',
      position: 'absolute' as const,
      right: position?.value.includes('right') ? '5%' : 'auto',
      left: position?.value.includes('left') ? '5%' : 'auto',
      bottom: position?.value.includes('bottom') ? '5%' : 'auto',
      top: position?.value.includes('top') ? '5%' : 'auto',
      zIndex: 50
    };
  };

  const getCharacterColor = (characterId?: string): string => {
    if (!characterId) return '#FFFFFF';
    const char = characters.find(c => c.id === characterId);
    return char?.color || '#FFFFFF';
  };

  const activeClip = getClipAtTime(currentTime);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hand className="w-5 h-5" />
          <h3 className="font-semibold">Sign Language</h3>
          <Badge variant="secondary">{clips.length} clips</Badge>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadSignLanguageClip(file);
            }}
            className="hidden"
          />
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Upload Clip'}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Clip List */}
        <div className="w-1/3 flex flex-col">
          <ScrollArea className="flex-1">
            {clips.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Hand className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No sign language clips yet</p>
                <p className="text-xs mt-2">Upload ASL/ISL interpretations</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clips.map((clip) => (
                  <Card
                    key={clip.id}
                    className={`cursor-pointer transition-colors ${
                      selectedClip?.id === clip.id ? 'border-primary bg-accent' : ''
                    } ${activeClip?.id === clip.id ? 'ring-2 ring-green-500' : ''}`}
                    onClick={() => setSelectedClip(clip)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {clip.language}
                            </Badge>
                            {activeClip?.id === clip.id && (
                              <Badge variant="default" className="text-xs">
                                Active
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(clip.startTime)} - {formatTime(clip.endTime)}
                          </p>
                          {clip.interpreter && (
                            <p className="text-xs font-medium mt-1">{clip.interpreter}</p>
                          )}
                        </div>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSignLanguageClip(clip.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="relative rounded overflow-hidden bg-muted">
                        <video
                          src={clip.clipUrl}
                          className="w-full h-20 object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Play className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Clip Editor */}
        <div className="flex-1 flex flex-col">
          {selectedClip ? (
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">Edit Sign Language Clip</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4 overflow-auto">
                {/* Video Preview */}
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  <video
                    ref={videoPreviewRef}
                    src={videoUrl}
                    className="w-full h-full object-contain"
                    controls
                  />
                  
                  {/* PiP Preview Overlay */}
                  <div style={getPositionStyle(selectedClip)}>
                    <video
                      src={selectedClip.clipUrl}
                      className="w-full h-full object-cover"
                      style={{
                        borderRadius: `${selectedClip.borderRadius}px`,
                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                      }}
                      muted
                      loop
                      autoPlay
                    />
                  </div>
                </div>

                {/* Timing */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Time</Label>
                    <Input
                      type="number"
                      value={selectedClip.startTime.toFixed(2)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setSelectedClip({ ...selectedClip, startTime: val });
                      }}
                      step="0.1"
                    />
                  </div>

                  <div>
                    <Label>End Time</Label>
                    <Input
                      type="number"
                      value={selectedClip.endTime.toFixed(2)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setSelectedClip({ ...selectedClip, endTime: val });
                      }}
                      step="0.1"
                    />
                  </div>
                </div>

                {/* Interpreter & Language */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Interpreter Name</Label>
                    <Input
                      value={selectedClip.interpreter}
                      onChange={(e) => 
                        setSelectedClip({ ...selectedClip, interpreter: e.target.value })
                      }
                      placeholder="Interpreter name"
                    />
                  </div>

                  <div>
                    <Label>Sign Language</Label>
                    <select
                      value={selectedClip.language}
                      onChange={(e) => 
                        setSelectedClip({ 
                          ...selectedClip, 
                          language: e.target.value as SignLanguageClip['language']
                        })
                      }
                      className="w-full px-2 py-2 border rounded bg-background"
                    >
                      {SIGN_LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Synced Character */}
                <div>
                  <Label>Sync with Character (Optional)</Label>
                  <select
                    value={selectedClip.syncedWithCharacter || ''}
                    onChange={(e) => 
                      setSelectedClip({ 
                        ...selectedClip, 
                        syncedWithCharacter: e.target.value || undefined 
                      })
                    }
                    className="w-full px-2 py-2 border rounded bg-background"
                  >
                    <option value="">None</option>
                    {characters.map(char => (
                      <option key={char.id} value={char.id}>
                        {char.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Border will use character's color when synced
                  </p>
                </div>

                {/* Position */}
                <div>
                  <Label>Position</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {POSITIONS.map(pos => (
                      <Button
                        key={pos.value}
                        size="sm"
                        variant={selectedClip.position === pos.value ? 'default' : 'outline'}
                        onClick={() => setSelectedClip({ ...selectedClip, position: pos.value })}
                      >
                        {pos.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Size */}
                <div>
                  <Label>Size</Label>
                  <div className="flex gap-2 mt-2">
                    {(['small', 'medium', 'large'] as const).map(size => (
                      <Button
                        key={size}
                        size="sm"
                        variant={selectedClip.size === size ? 'default' : 'outline'}
                        onClick={() => setSelectedClip({ ...selectedClip, size })}
                        className="flex-1 capitalize"
                      >
                        {size}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Opacity */}
                <div>
                  <Label>Opacity: {Math.round(selectedClip.opacity * 100)}%</Label>
                  <Slider
                    value={[selectedClip.opacity]}
                    onValueChange={([v]) => setSelectedClip({ ...selectedClip, opacity: v })}
                    min={0.3}
                    max={1.0}
                    step={0.1}
                  />
                </div>

                {/* Border Radius */}
                <div>
                  <Label>Corner Radius: {selectedClip.borderRadius}px</Label>
                  <Slider
                    value={[selectedClip.borderRadius]}
                    onValueChange={([v]) => setSelectedClip({ ...selectedClip, borderRadius: v })}
                    min={0}
                    max={50}
                    step={2}
                  />
                </div>

                {/* Border Toggle */}
                <div className="flex items-center justify-between">
                  <Label>Show Border</Label>
                  <input
                    type="checkbox"
                    checked={selectedClip.hasBorder}
                    onChange={(e) => 
                      setSelectedClip({ ...selectedClip, hasBorder: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                </div>

                {/* Save Button */}
                <Button
                  className="w-full"
                  onClick={() => updateSignLanguageClip(selectedClip)}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Hand className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a clip to edit</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

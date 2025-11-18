import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Ear, Plus, Play, Volume2, AlertTriangle,
  CheckCircle, Trash2, Save, Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AudioDescription {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  type: 'standard' | 'extended';
  voice: string;
  speed: number;
  pauseOriginalAudio: boolean;
  isConflict: boolean;
  generatedAudioUrl?: string;
  status: 'draft' | 'generated' | 'approved';
}

interface Scene {
  id: string;
  startTime: number;
  endTime: number;
  text?: string;
}

interface AudioDescriptionEditorProps {
  videoId: string;
  videoUrl: string;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  scenes: Scene[];
}

// Available ElevenLabs voices for AD
const AD_VOICES = [
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', description: 'Clear, professional female' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Warm, authoritative female' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', description: 'Deep, narrative male' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', description: 'Calm, soothing male' }
];

export function AudioDescriptionEditor({
  videoId,
  videoUrl,
  currentTime,
  onTimeUpdate,
  scenes
}: AudioDescriptionEditorProps) {
  const [descriptions, setDescriptions] = useState<AudioDescription[]>([]);
  const [selectedDesc, setSelectedDesc] = useState<AudioDescription | null>(null);
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    loadAudioDescriptions();
  }, [videoId]);

  const loadAudioDescriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('audio_descriptions')
        .select('*')
        .eq('video_id', videoId)
        .order('start_time', { ascending: true });

      if (error) throw error;

      const ads: AudioDescription[] = (data || []).map(d => ({
        id: d.id,
        startTime: d.start_time,
        endTime: d.end_time,
        text: d.description,
        type: d.extension_type === 'pause' ? 'extended' : 'standard',
        voice: d.voice_id || AD_VOICES[0].id,
        speed: 1.0,
        pauseOriginalAudio: d.extension_type === 'pause',
        isConflict: false,
        generatedAudioUrl: d.audio_url || undefined,
        status: d.audio_url ? 'generated' : 'draft'
      }));

      const withConflicts = detectConflicts(ads);
      setDescriptions(withConflicts);

    } catch (error) {
      console.error('Failed to load audio descriptions:', error);
      toast.error('Failed to load audio descriptions');
    }
  };

  const detectConflicts = (ads: AudioDescription[]): AudioDescription[] => {
    return ads.map(ad => {
      const hasConflict = scenes.some(scene => {
        const sceneHasDialogue = scene.text && scene.text.trim().length > 0;
        const overlaps = 
          (ad.startTime >= scene.startTime && ad.startTime < scene.endTime) ||
          (ad.endTime > scene.startTime && ad.endTime <= scene.endTime) ||
          (ad.startTime <= scene.startTime && ad.endTime >= scene.endTime);
        
        return sceneHasDialogue && overlaps;
      });

      return {
        ...ad,
        isConflict: hasConflict && ad.type === 'standard'
      };
    });
  };

  const addAudioDescription = async () => {
    const newAd: Partial<AudioDescription> = {
      startTime: currentTime,
      endTime: currentTime + 5,
      text: '',
      type: 'standard',
      voice: AD_VOICES[0].id,
      speed: 1.0,
      pauseOriginalAudio: false,
      isConflict: false,
      status: 'draft'
    };

    try {
      const { data, error } = await supabase
        .from('audio_descriptions')
        .insert({
          video_id: videoId,
          start_time: newAd.startTime,
          end_time: newAd.endTime,
          description: newAd.text,
          description_type: 'visual',
          extension_type: 'none',
          voice_id: newAd.voice,
          language: 'en'
        })
        .select()
        .single();

      if (error) throw error;

      const savedAd: AudioDescription = {
        id: data.id,
        startTime: data.start_time,
        endTime: data.end_time,
        text: data.description,
        type: 'standard',
        voice: data.voice_id || AD_VOICES[0].id,
        speed: 1.0,
        pauseOriginalAudio: false,
        isConflict: false,
        status: 'draft'
      };

      setDescriptions(prev => detectConflicts([...prev, savedAd].sort((a, b) => a.startTime - b.startTime)));
      setSelectedDesc(savedAd);
      toast.success('Audio description added');

    } catch (error) {
      console.error('Failed to add audio description:', error);
      toast.error('Failed to add audio description');
    }
  };

  const updateAudioDescription = async (ad: AudioDescription) => {
    try {
      const { error } = await supabase
        .from('audio_descriptions')
        .update({
          start_time: ad.startTime,
          end_time: ad.endTime,
          description: ad.text,
          extension_type: ad.type === 'extended' ? 'pause' : 'none',
          voice_id: ad.voice
        })
        .eq('id', ad.id);

      if (error) throw error;

      setDescriptions(prev => 
        detectConflicts(prev.map(d => d.id === ad.id ? ad : d))
      );

      toast.success('Audio description updated');

    } catch (error) {
      console.error('Failed to update audio description:', error);
      toast.error('Failed to update audio description');
    }
  };

  const generateAudio = async (ad: AudioDescription) => {
    if (!ad.text.trim()) {
      toast.error('Please add description text first');
      return;
    }

    setIsGenerating(true);
    try {
      setDescriptions(prev => prev.map(d => 
        d.id === ad.id ? { ...d, status: 'draft' as const } : d
      ));

      toast.info('Generating audio with ElevenLabs...');

      const { data, error } = await supabase.functions.invoke('generate-ad-audio', {
        body: {
          text: ad.text,
          voiceId: ad.voice,
          adId: ad.id,
          videoId
        }
      });

      if (error) throw error;

      setDescriptions(prev => prev.map(d => 
        d.id === ad.id 
          ? { ...d, generatedAudioUrl: data.audioUrl, status: 'generated' as const }
          : d
      ));

      if (selectedDesc?.id === ad.id) {
        setSelectedDesc(prev => prev ? { ...prev, generatedAudioUrl: data.audioUrl, status: 'generated' } : null);
      }

      toast.success('Audio generated successfully');

    } catch (error) {
      console.error('Failed to generate audio:', error);
      toast.error('Failed to generate audio');
      
      setDescriptions(prev => prev.map(d => 
        d.id === ad.id ? { ...d, status: 'draft' as const } : d
      ));
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteAudioDescription = async (adId: string) => {
    try {
      const { error } = await supabase
        .from('audio_descriptions')
        .delete()
        .eq('id', adId);

      if (error) throw error;

      setDescriptions(prev => prev.filter(d => d.id !== adId));
      if (selectedDesc?.id === adId) setSelectedDesc(null);
      
      toast.success('Audio description deleted');

    } catch (error) {
      console.error('Failed to delete audio description:', error);
      toast.error('Failed to delete audio description');
    }
  };

  const playPreview = (ad: AudioDescription) => {
    if (ad.generatedAudioUrl && audioRef.current) {
      audioRef.current.src = ad.generatedAudioUrl;
      audioRef.current.play();
      toast.info('Playing preview...');
    } else {
      toast.error('Audio not generated yet');
    }
  };

  const suggestADFromVisuals = async (startTime: number, endTime: number) => {
    try {
      toast.info('Analyzing visuals...');

      const { data, error } = await supabase.functions.invoke('generate-visual-descriptions', {
        body: {
          videoId,
          startTime,
          endTime
        }
      });

      if (error) throw error;

      return data.description || '';

    } catch (error) {
      console.error('Failed to suggest AD:', error);
      toast.error('Failed to analyze visuals');
      return '';
    }
  };

  const filteredDescriptions = showConflictsOnly 
    ? descriptions.filter(d => d.isConflict)
    : descriptions;

  return (
    <div className="h-full flex flex-col">
      <audio ref={audioRef} />

      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ear className="w-5 h-5" />
          <h3 className="font-semibold">Audio Description</h3>
          <Badge variant="secondary">{descriptions.length} AD</Badge>
          {descriptions.some(d => d.isConflict) && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {descriptions.filter(d => d.isConflict).length} Conflicts
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="show-conflicts" className="text-sm">
            Conflicts Only
          </Label>
          <Switch
            id="show-conflicts"
            checked={showConflictsOnly}
            onCheckedChange={setShowConflictsOnly}
          />
          
          <Button size="sm" onClick={addAudioDescription}>
            <Plus className="w-4 h-4 mr-2" />
            Add AD
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* List of ADs */}
        <div className="w-1/2 flex flex-col">
          <ScrollArea className="flex-1">
            {filteredDescriptions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {showConflictsOnly 
                  ? 'No conflicts detected' 
                  : 'No audio descriptions yet'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDescriptions.map((ad) => (
                  <Card
                    key={ad.id}
                    className={`cursor-pointer transition-colors ${
                      selectedDesc?.id === ad.id ? 'border-primary bg-accent' : ''
                    }`}
                    onClick={() => setSelectedDesc(ad)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={ad.type === 'extended' ? 'default' : 'secondary'}>
                            {ad.type === 'extended' ? 'EAD' : 'AD'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(ad.startTime)} - {formatTime(ad.endTime)}
                          </span>
                          {ad.isConflict && (
                            <AlertTriangle className="w-3 h-3 text-destructive" />
                          )}
                        </div>
                        
                        <div className="flex gap-1">
                          {ad.status === 'generated' && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteAudioDescription(ad.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-sm line-clamp-2">
                        {ad.text || <span className="text-muted-foreground">No text yet</span>}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* AD Editor */}
        <div className="w-1/2 flex flex-col">
          {selectedDesc ? (
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">Edit Audio Description</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4 overflow-y-auto">
                {/* Timing */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Time</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={selectedDesc.startTime.toFixed(2)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setSelectedDesc({ ...selectedDesc, startTime: val });
                        }}
                        step="0.1"
                        className="flex-1 px-2 py-1 border rounded text-sm bg-background"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedDesc({ ...selectedDesc, startTime: currentTime });
                        }}
                      >
                        Now
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>End Time</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={selectedDesc.endTime.toFixed(2)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setSelectedDesc({ ...selectedDesc, endTime: val });
                        }}
                        step="0.1"
                        className="flex-1 px-2 py-1 border rounded text-sm bg-background"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedDesc({ ...selectedDesc, endTime: currentTime });
                        }}
                      >
                        Now
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Type Toggle */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="extended-ad">Extended AD (EAD)</Label>
                  <Switch
                    id="extended-ad"
                    checked={selectedDesc.type === 'extended'}
                    onCheckedChange={(checked) => {
                      setSelectedDesc({
                        ...selectedDesc,
                        type: checked ? 'extended' : 'standard',
                        pauseOriginalAudio: checked
                      });
                    }}
                  />
                </div>

                {selectedDesc.type === 'extended' && (
                  <p className="text-xs text-muted-foreground">
                    Extended AD will pause the original audio during playback
                  </p>
                )}

                {/* Description Text */}
                <div className="flex-1 flex flex-col">
                  <Label>Description Text</Label>
                  <Textarea
                    value={selectedDesc.text}
                    onChange={(e) => setSelectedDesc({ ...selectedDesc, text: e.target.value })}
                    placeholder="Describe what's happening visually..."
                    className="flex-1 resize-none min-h-[120px]"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-muted-foreground">
                      {selectedDesc.text.length} characters
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const suggestion = await suggestADFromVisuals(
                          selectedDesc.startTime,
                          selectedDesc.endTime
                        );
                        if (suggestion) {
                          setSelectedDesc({ ...selectedDesc, text: suggestion });
                        }
                      }}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Suggest
                    </Button>
                  </div>
                </div>

                {/* Voice Selection */}
                <div>
                  <Label>Voice</Label>
                  <select
                    value={selectedDesc.voice}
                    onChange={(e) => setSelectedDesc({ ...selectedDesc, voice: e.target.value })}
                    className="w-full px-2 py-1.5 border rounded bg-background"
                  >
                    {AD_VOICES.map(voice => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name} - {voice.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Speed */}
                <div>
                  <Label>Speed: {selectedDesc.speed.toFixed(1)}x</Label>
                  <Slider
                    value={[selectedDesc.speed]}
                    onValueChange={([v]) => setSelectedDesc({ ...selectedDesc, speed: v })}
                    min={0.5}
                    max={1.5}
                    step={0.1}
                  />
                </div>

                {/* Conflict Warning */}
                {selectedDesc.isConflict && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive rounded">
                    <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
                    <div className="flex-1 text-sm">
                      <p className="font-medium text-destructive">Timing Conflict</p>
                      <p className="text-xs text-muted-foreground">
                        This AD overlaps with dialogue. Consider using Extended AD (EAD) or adjusting the timing.
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => updateAudioDescription(selectedDesc)}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => generateAudio(selectedDesc)}
                    disabled={!selectedDesc.text.trim() || isGenerating}
                  >
                    <Volume2 className="w-4 h-4 mr-2" />
                    {isGenerating ? 'Generating...' : 'Generate'}
                  </Button>

                  {selectedDesc.generatedAudioUrl && (
                    <Button
                      variant="outline"
                      onClick={() => playPreview(selectedDesc)}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Select an AD to edit</p>
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

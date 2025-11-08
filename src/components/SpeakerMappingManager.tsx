import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Character {
  id: string;
  name: string;
  type: string;
  color: string;
}

interface Speaker {
  name: string;
  asr_label?: string;
}

interface SpeakerMappingManagerProps {
  videoId: string;
  language: string;
  characters: Character[];
  existingSpeakers?: string[];
}

export const SpeakerMappingManager: React.FC<SpeakerMappingManagerProps> = ({
  videoId,
  language,
  characters,
  existingSpeakers
}) => {
  const [speakerMappings, setSpeakerMappings] = useState<Record<string, string>>({});
  const [availableSpeakers, setAvailableSpeakers] = useState<Speaker[]>([]);
  const [savingMappings, setSavingMappings] = useState<Set<string>>(new Set());
  const loadedRef = useRef(false);
  const { toast } = useToast();

  // Normalize speaker keys to "Speaker X" format for consistency
  const normalizeSpeakerKey = (value: string): string => {
    const match = value.match(/(\d+|[A-Z])$/);
    return match ? `Speaker ${match[1]}` : value;
  };

  const toSpeakerKey = (speaker: Speaker): string =>
    speaker.asr_label ? `Speaker ${speaker.asr_label}` : speaker.name;

  // Load speakers from database
  useEffect(() => {
    const loadSpeakers = async () => {
      try {
        const speakersMap = new Map<string, Speaker>();

        // Load from transcript segments with ASR labels
        const { data: segments } = await supabase
          .from('transcript_segments_clean')
          .select('speaker, speaker_asr_label')
          .eq('video_id', videoId)
          .eq('language', language)
          .order('start_time');

        (segments || []).forEach((seg: any) => {
          if (seg?.speaker) {
            speakersMap.set(seg.speaker, {
              name: seg.speaker,
              asr_label: seg.speaker_asr_label || undefined
            });
          }
        });

        // Merge with existingSpeakers prop
        if (existingSpeakers && existingSpeakers.length > 0) {
          existingSpeakers.forEach(speaker => {
            if (!speakersMap.has(speaker)) {
              speakersMap.set(speaker, { name: speaker });
            }
          });
        }

        const speakers = Array.from(speakersMap.values()).sort((a, b) => 
          a.name.localeCompare(b.name)
        );

        setAvailableSpeakers(speakers);
        console.log('🎤 Speakers loaded:', speakers);
      } catch (error) {
        console.error('Failed to load speakers:', error);
      }
    };

    loadSpeakers();
  }, [videoId, language, existingSpeakers]);

  // Load existing mappings from database
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const loadMappings = async () => {
      try {
        // Load character IDs
        const { data: chars } = await supabase
          .from('characters')
          .select('id, name')
          .eq('video_id', videoId);

        const idToName = new Map((chars || []).map(c => [c.id, c.name]));

        // Load mappings from transcript segments
        const { data: segments } = await supabase
          .from('transcript_segments_clean')
          .select('speaker, speaker_asr_label, character_id')
          .eq('video_id', videoId)
          .eq('language', language)
          .not('character_id', 'is', null);

        const mappings: Record<string, string> = {};

        if (segments && segments.length > 0) {
          segments.forEach(seg => {
            const characterName = idToName.get(seg.character_id);
            if (characterName) {
              const speakerKey = seg.speaker_asr_label
                ? normalizeSpeakerKey(`Speaker ${seg.speaker_asr_label}`)
                : normalizeSpeakerKey(seg.speaker);
              mappings[speakerKey] = characterName;
            }
          });
        }

        setSpeakerMappings(mappings);
        console.log('🔗 Mappings loaded:', mappings);
      } catch (error) {
        console.error('Failed to load mappings:', error);
      }
    };

    loadMappings();
  }, [videoId, language]);

  // Save mapping to database
  const saveMappingToDatabase = async (speakerKey: string, characterName: string) => {
    try {
      // Extract bare ASR label
      const match = speakerKey.match(/(\d+|[A-Z])$/);
      const asrLabelBare = match ? match[1] : speakerKey;

      // Get character ID
      const { data: character } = await supabase
        .from('characters')
        .select('id')
        .eq('video_id', videoId)
        .eq('name', characterName)
        .maybeSingle();

      if (!character) {
        throw new Error(`Character "${characterName}" not found in database`);
      }

      // Apply mapping via RPC
      const { error } = await supabase.rpc('apply_specific_mapping', {
        p_video_id: videoId,
        p_language: language,
        p_asr_label: asrLabelBare,
        p_character_id: character.id
      });

      if (error) throw error;

      // Sync character properties to segments
      await supabase.rpc('sync_character_to_segments', {
        p_video_id: videoId,
        p_language: language,
        p_character_id: character.id
      });

      // Save to speaker_mappings table
      const { error: upsertError } = await supabase
        .from('speaker_mappings')
        .upsert({
          video_id: videoId,
          language: language,
          mappings: { ...speakerMappings, [speakerKey]: characterName }
        }, {
          onConflict: 'video_id,language'
        });

      if (upsertError) throw upsertError;

      console.log(`✅ Saved mapping: ${speakerKey} → ${characterName}`);
    } catch (error) {
      console.error('Failed to save mapping:', error);
      throw error;
    }
  };

  const handleMappingChange = async (characterName: string, selectedSpeaker: string) => {
    if (savingMappings.has(characterName)) return;

    setSavingMappings(prev => new Set(prev).add(characterName));

    try {
      const normalized = selectedSpeaker !== 'unassigned' 
        ? normalizeSpeakerKey(selectedSpeaker) 
        : selectedSpeaker;

      // Update local state
      setSpeakerMappings(prev => {
        const next: Record<string, string> = {};
        // Remove previous mapping to this character
        for (const [speaker, char] of Object.entries(prev)) {
          if (char !== characterName) {
            next[speaker] = char;
          }
        }
        // Add new mapping
        if (normalized !== 'unassigned') {
          next[normalized] = characterName;
        }
        return next;
      });

      // Save to database
      if (normalized !== 'unassigned') {
        await saveMappingToDatabase(normalized, characterName);
      }

      toast({
        title: "Mapping Saved",
        description: normalized === 'unassigned'
          ? `${characterName} unmapped`
          : `${characterName} → ${normalized}`
      });

      // Trigger UI refresh
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('transcript-segments-updated', {
          detail: { videoId, language }
        }));
      }, 300);
    } catch (error) {
      console.error('Failed to save mapping:', error);
      toast({
        title: "Save Failed",
        description: "Could not save character mapping",
        variant: "destructive"
      });
    } finally {
      setSavingMappings(prev => {
        const next = new Set(prev);
        next.delete(characterName);
        return next;
      });
    }
  };

  const getMappedSpeaker = (characterName: string): string => {
    return Object.keys(speakerMappings).find(sp => speakerMappings[sp] === characterName) || 'unassigned';
  };

  if (characters.length === 0) return null;

  return (
    <Card className="border-orange-200/50 bg-orange-50/30 rounded-xl">
      <CardContent className="p-4 space-y-3">
        <h4 className="text-lg font-light text-orange-800">
          Speaker Assignment
        </h4>
        <p className="text-base font-light leading-relaxed text-orange-700">
          Map each character to a detected transcript speaker. Colors come from Character Management.
        </p>
        <div className="text-sm font-light text-orange-600 bg-orange-100/80 p-3 rounded-lg border border-orange-200">
          <strong>Status:</strong> {characters.length} characters • {availableSpeakers.length} detected speakers
        </div>
        <div className="space-y-2">
          {characters.map((char) => {
            const mappedSpeaker = getMappedSpeaker(char.name);
            return (
              <div key={char.id} className="flex items-center gap-3 text-sm">
                <Badge variant="outline" className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 rounded-full"
                      style={{ backgroundColor: char.color }}
                    />
                    {char.name} ({char.type})
                  </div>
                </Badge>
                <span className="text-muted-foreground">→</span>
                <div className="flex items-center gap-2">
                  <Select
                    value={mappedSpeaker}
                    disabled={savingMappings.has(char.name)}
                    onValueChange={(value) => handleMappingChange(char.name, value)}
                  >
                    <SelectTrigger className="h-7 w-56">
                      <SelectValue placeholder="Select detected speaker..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50 shadow-lg">
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {availableSpeakers.map(sp => (
                        <SelectItem key={sp.name} value={toSpeakerKey(sp)}>
                          {sp.name} {sp.asr_label ? `(Speaker ${sp.asr_label})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {savingMappings.has(char.name) && (
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

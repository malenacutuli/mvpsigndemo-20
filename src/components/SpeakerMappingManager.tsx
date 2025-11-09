import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  // Store speaker key -> character UUID mappings
  const [speakerMappings, setSpeakerMappings] = useState<Record<string, string>>({});
  const [availableSpeakers, setAvailableSpeakers] = useState<Speaker[]>([]);
  const [savingMappings, setSavingMappings] = useState<Set<string>>(new Set());
  const loadedRef = useRef(false);
  const { toast } = useToast();

  // Helper: Get character name from UUID
  const getCharacterName = (characterId: string): string => {
    return characters.find(c => c.id === characterId)?.name || '';
  };

  // Helper: Get character UUID from name
  const getCharacterUuid = (characterName: string): string => {
    return characters.find(c => c.name === characterName)?.id || '';
  };

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
        // Load mappings from speaker_mappings table (preferred source)
        const { data: savedMappings } = await supabase
          .from('speaker_mappings')
          .select('mappings')
          .eq('video_id', videoId)
          .eq('language', language)
          .maybeSingle();

        if (savedMappings?.mappings) {
          // Check if mappings use UUIDs (new format) or names (legacy format)
          const firstValue = Object.values(savedMappings.mappings)[0];
          const isUuidFormat = firstValue && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(firstValue as string);
          
          if (isUuidFormat) {
            // New UUID format - use directly
            setSpeakerMappings(savedMappings.mappings as Record<string, string>);
            console.log('🔗 Mappings loaded (UUID format):', savedMappings.mappings);
          } else {
            // Legacy name format - convert to UUIDs
            const converted: Record<string, string> = {};
            Object.entries(savedMappings.mappings).forEach(([speaker, characterName]) => {
              const uuid = getCharacterUuid(characterName as string);
              if (uuid) converted[speaker] = uuid;
            });
            setSpeakerMappings(converted);
            console.log('🔗 Mappings loaded (converted from legacy):', converted);
          }
          return;
        }

        // Fallback: Load from transcript segments
        const { data: segments } = await supabase
          .from('transcript_segments_clean')
          .select('speaker, speaker_asr_label, character_id')
          .eq('video_id', videoId)
          .eq('language', language)
          .not('character_id', 'is', null);

        const mappings: Record<string, string> = {};

        if (segments && segments.length > 0) {
          segments.forEach(seg => {
            if (seg.character_id) {
              const speakerKey = seg.speaker_asr_label
                ? normalizeSpeakerKey(`Speaker ${seg.speaker_asr_label}`)
                : normalizeSpeakerKey(seg.speaker);
              mappings[speakerKey] = seg.character_id;
            }
          });
        }

        setSpeakerMappings(mappings);
        console.log('🔗 Mappings loaded from segments:', mappings);
      } catch (error) {
        console.error('❌ Failed to load mappings:', error);
        toast({
          title: t('speakerMapping.errors.loadFailed'),
          description: t('speakerMapping.errors.couldNotLoad'),
          variant: "destructive"
        });
      }
    };

    loadMappings();
  }, [videoId, language, characters, toast, getCharacterUuid]);

  // Save mapping to database with retry logic
  const saveMappingToDatabase = async (speakerKey: string, characterId: string, retryCount = 0): Promise<void> => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;

    try {
      console.log(`💾 Saving mapping: ${speakerKey} → ${characterId} (attempt ${retryCount + 1})`);

      // Extract bare ASR label
      const match = speakerKey.match(/(\d+|[A-Z])$/);
      const asrLabelBare = match ? match[1] : speakerKey;

      // Step 1: Apply mapping via RPC
      try {
        const { error: rpcError } = await supabase.rpc('apply_specific_mapping', {
          p_video_id: videoId,
          p_language: language,
          p_asr_label: asrLabelBare,
          p_character_id: characterId
        });

        if (rpcError) {
          console.error('❌ RPC apply_specific_mapping failed:', rpcError);
          throw new Error(`Failed to apply mapping: ${rpcError.message}`);
        }
        console.log('✅ Step 1: RPC apply_specific_mapping succeeded');
      } catch (rpcErr) {
        throw new Error(`Step 1 failed (apply_specific_mapping): ${rpcErr instanceof Error ? rpcErr.message : 'Unknown error'}`);
      }

      // Step 2: Sync character properties to segments
      try {
        const { error: syncError } = await supabase.rpc('sync_character_to_segments', {
          p_video_id: videoId,
          p_language: language,
          p_character_id: characterId
        });

        if (syncError) {
          console.error('❌ RPC sync_character_to_segments failed:', syncError);
          throw new Error(`Failed to sync character: ${syncError.message}`);
        }
        console.log('✅ Step 2: RPC sync_character_to_segments succeeded');
      } catch (syncErr) {
        throw new Error(`Step 2 failed (sync_character_to_segments): ${syncErr instanceof Error ? syncErr.message : 'Unknown error'}`);
      }

      // Step 3: Save to speaker_mappings table with UUID
      try {
        const updatedMappings = { ...speakerMappings, [speakerKey]: characterId };
        
        const { error: upsertError } = await supabase
          .from('speaker_mappings')
          .upsert({
            video_id: videoId,
            language: language,
            mappings: updatedMappings
          }, {
            onConflict: 'video_id,language'
          });

        if (upsertError) {
          console.error('❌ speaker_mappings upsert failed:', upsertError);
          throw new Error(`Failed to save mappings: ${upsertError.message}`);
        }
        console.log('✅ Step 3: speaker_mappings upsert succeeded');
      } catch (upsertErr) {
        throw new Error(`Step 3 failed (speaker_mappings upsert): ${upsertErr instanceof Error ? upsertErr.message : 'Unknown error'}`);
      }

      console.log(`✅ Mapping saved successfully: ${speakerKey} → ${getCharacterName(characterId)}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Save mapping failed (attempt ${retryCount + 1}/${MAX_RETRIES}):`, errorMessage);

      // Retry logic for transient failures (excluding authentication errors)
      if (retryCount < MAX_RETRIES && !errorMessage.includes('401') && !errorMessage.includes('403')) {
        console.log(`🔄 Retrying in ${RETRY_DELAY * (retryCount + 1)}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        return saveMappingToDatabase(speakerKey, characterId, retryCount + 1);
      }

      throw new Error(`${errorMessage} (after ${retryCount + 1} attempts)`);
    }
  };

  const handleMappingChange = async (characterName: string, selectedSpeaker: string) => {
    if (savingMappings.has(characterName)) return;

    const characterId = getCharacterUuid(characterName);
    if (!characterId && selectedSpeaker !== 'unassigned') {
      toast({
        title: t('speakerMapping.errors.error'),
        description: t('speakerMapping.errors.characterNotFound', { name: characterName }),
        variant: "destructive"
      });
      return;
    }

    setSavingMappings(prev => new Set(prev).add(characterName));

    try {
      const normalized = selectedSpeaker !== 'unassigned' 
        ? normalizeSpeakerKey(selectedSpeaker) 
        : selectedSpeaker;

      // Update local state with UUID
      setSpeakerMappings(prev => {
        const next: Record<string, string> = {};
        // Remove previous mapping to this character UUID
        for (const [speaker, charId] of Object.entries(prev)) {
          if (charId !== characterId) {
            next[speaker] = charId;
          }
        }
        // Add new mapping with UUID
        if (normalized !== 'unassigned' && characterId) {
          next[normalized] = characterId;
        }
        return next;
      });

      // Save to database
      if (normalized !== 'unassigned' && characterId) {
        await saveMappingToDatabase(normalized, characterId);
      }

      toast({
        title: t('speakerMapping.success.mappingSaved'),
        description: normalized === 'unassigned'
          ? t('speakerMapping.success.unmapped', { name: characterName })
          : t('speakerMapping.success.mapped', { name: characterName, speaker: normalized })
      });

      // Trigger UI refresh
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('transcript-segments-updated', {
          detail: { videoId, language }
        }));
      }, 300);
    } catch (error) {
      console.error('❌ Failed to save mapping:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Provide specific error message based on failure
      let description = t('speakerMapping.errors.couldNotSave');
      if (errorMessage.includes('apply_specific_mapping')) {
        description = t('speakerMapping.errors.failedApplyMapping');
      } else if (errorMessage.includes('sync_character_to_segments')) {
        description = t('speakerMapping.errors.failedSyncCharacter');
      } else if (errorMessage.includes('speaker_mappings')) {
        description = t('speakerMapping.errors.failedSaveDatabase');
      } else if (errorMessage.includes('not found')) {
        description = errorMessage;
      }

      toast({
        title: t('speakerMapping.errors.saveFailed'),
        description,
        variant: "destructive"
      });

      // Revert local state on failure
      setSpeakerMappings(prev => prev);
    } finally {
      setSavingMappings(prev => {
        const next = new Set(prev);
        next.delete(characterName);
        return next;
      });
    }
  };

  const getMappedSpeaker = (characterName: string): string => {
    const characterId = getCharacterUuid(characterName);
    return Object.keys(speakerMappings).find(sp => speakerMappings[sp] === characterId) || 'unassigned';
  };

  if (characters.length === 0) return null;

  return (
    <Card className="border-orange-200/50 bg-orange-50/30 rounded-xl">
      <CardContent className="p-4 space-y-3">
        <h4 className="text-lg font-light text-orange-800">
          {t('speakerMapping.title')}
        </h4>
        <p className="text-base font-light leading-relaxed text-orange-700">
          {t('speakerMapping.description')}
        </p>
        <div className="text-sm font-light text-orange-600 bg-orange-100/80 p-3 rounded-lg border border-orange-200">
          <strong>{t('speakerMapping.status')}</strong> {characters.length} {t('speakerMapping.characters')} • {availableSpeakers.length} {t('speakerMapping.detectedSpeakers')}
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
                      <SelectValue placeholder={t('speakerMapping.selectSpeaker')} />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50 shadow-lg">
                      <SelectItem value="unassigned">{t('speakerMapping.unassigned')}</SelectItem>
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

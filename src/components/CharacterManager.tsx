import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Crown, Star, Users, Palette, Volume2, Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { VoiceSelector } from './VoiceSelector';
import { useVideoStorage } from '@/hooks/useVideoStorage';
import { supabase } from '@/integrations/supabase/client';

// Captions with Intention color palette
const CI_COLORS = {
  // Main Characters (6 primary colors)
  main: {
    yellow: '#E5E517',
    blue: '#17E5E5', 
    red: '#E51717',
    orange: '#E58017',
    green: '#17E517',
    pink: '#E517E5'
  },
  // Supporting Characters (between main colors)
  supporting: {
    orange1: '#E85C2E',
    blue1: '#47C2EB',
    yellow1: '#EBC247',
    blue2: '#5E82ED',
    green1: '#C2EB47',
    purple1: '#8C6BED',
    green2: '#82ED5E',
    purple2: '#CC6BED',
    green3: '#47EB70',
    pink1: '#EB47C2',
    cyan: '#5EEDC9',
    pink2: '#ED5E82'
  },
  // Minor Characters (pastel tones from center of wheel)
  minor: [
    'hsl(0, 30%, 90%)',
    'hsl(342, 30%, 90%)',
    'hsl(327, 30%, 90%)',
    'hsl(313, 30%, 90%)',
    'hsl(298, 30%, 90%)',
    'hsl(282, 30%, 90%)',
    'hsl(267, 30%, 90%)',
    'hsl(251, 30%, 90%)',
    'hsl(240, 30%, 90%)',
    'hsl(222, 30%, 90%)',
    'hsl(207, 30%, 90%)',
    'hsl(193, 30%, 90%)',
    'hsl(178, 30%, 90%)',
    'hsl(162, 30%, 90%)',
    'hsl(149, 30%, 90%)',
    'hsl(133, 30%, 90%)',
    'hsl(120, 30%, 90%)',
    'hsl(102, 30%, 90%)',
    'hsl(87, 30%, 90%)',
    'hsl(73, 30%, 90%)',
    'hsl(58, 30%, 90%)',
    'hsl(40, 30%, 90%)',
    'hsl(24, 30%, 90%)',
    'hsl(7, 30%, 90%)'
  ]
};

interface Character {
  id: string;
  name: string;
  type: 'hero' | 'villain' | 'main' | 'supporting' | 'minor';
  color: string;
  isOffCamera?: boolean;
  voiceId?: string;
  voiceName?: string;
  voiceType?: 'elevenlabs' | 'native';
  emphasis?: 'loud' | 'quiet' | 'normal';
  pitch?: 'high' | 'low' | 'normal';
  language?: string; // Add language property for multilingual support
}

interface CharacterManagerProps {
  videoId: string;
  onCharactersUpdate?: (characters: Character[]) => void;
  existingCharacters?: Character[];
  language?: string; // Add language prop for multilingual support
  existingSpeakers?: string[]; // Optional list of detected speakers to map
}

export const CharacterManager: React.FC<CharacterManagerProps> = ({ 
  videoId, 
  onCharactersUpdate, 
  existingCharacters = [],
  language = 'en', // Default to English
  existingSpeakers
}) => {
  const [characters, setCharacters] = useState<Character[]>(existingCharacters);
  const [newCharacterName, setNewCharacterName] = useState('');
  const [newCharacterType, setNewCharacterType] = useState<Character['type']>('main');
  const [speakerMappings, setSpeakerMappings] = useState<Record<string, string>>({});
  const [availableSpeakers, setAvailableSpeakers] = useState<string[]>([]);
  const { saveCharacters, loadCharacters, saveSpeakerMappings, loadSpeakerMappings } = useVideoStorage(videoId);

  // Load existing characters on mount
  useEffect(() => {
    const loadExistingCharacters = async () => {
      if (existingCharacters.length === 0) {
        try {
          const savedCharacters = await loadCharacters();
          if (savedCharacters.length > 0) {
            setCharacters(savedCharacters);
            onCharactersUpdate(savedCharacters);
          }
        } catch (error) {
          console.error('Failed to load characters:', error);
        }
      }
    };

    loadExistingCharacters();
  }, [videoId]);
  const { toast } = useToast();

  // Load cached speaker data when no speakers are provided from transcript
  const loadCachedSpeakerData = async () => {
    try {
      const { data } = await supabase
        .from('content_generation_cache')
        .select('result_data')
        .eq('video_id', videoId)
        .eq('content_type', 'speaker_diarization')
        .eq('language', language)
        .single();

      if (data?.result_data && typeof data.result_data === 'object' && data.result_data !== null) {
        const resultData = data.result_data as any;
        if (resultData.speakers && Array.isArray(resultData.speakers)) {
          const cachedSpeakers = resultData.speakers.map((s: any) => s.name);
          // Merge into stable list
          const merged = Array.from(new Set([...
            (sessionStorage.getItem(`speakers_${videoId}_${language}`)?.split('\n') || []),
            ...cachedSpeakers,
          ].filter(Boolean))).sort();
          setAvailableSpeakers(merged);
          sessionStorage.setItem(`speakers_${videoId}_${language}`, merged.join('\n'));
          console.log('📋 Loaded cached speakers:', merged);
        }
      }
    } catch (error) {
      console.log('📋 No cached speaker data found');
    }
  };

  // Load speakers from DB (transcript + mappings) and stabilize the list
  const loadSpeakersFromDB = async () => {
    try {
      const speakersSet = new Set<string>();
      // From transcript segments
      const { data: segs } = await supabase
        .from('transcript_segments_clean')
        .select('speaker')
        .eq('video_id', videoId)
        .eq('language', language)
        .order('start_time');
      (segs || []).forEach((r: any) => r?.speaker && speakersSet.add(r.speaker));

      // From latest speaker mappings (keys)
      const { data: mapRow } = await supabase
        .from('speaker_mappings')
        .select('mappings')
        .eq('video_id', videoId)
        .eq('language', language)
        .maybeSingle();
      const mappings = (mapRow?.mappings as Record<string, string>) || {};
      Object.keys(mappings).forEach(k => speakersSet.add(k));

      // Merge with cache and any previous stable list
      const stable = (sessionStorage.getItem(`speakers_${videoId}_${language}`)?.split('\n') || []).filter(Boolean);
      stable.forEach(s => speakersSet.add(s));

      const merged = Array.from(speakersSet).filter(Boolean).sort();
      if (merged.length > 0) {
        setAvailableSpeakers(merged);
        sessionStorage.setItem(`speakers_${videoId}_${language}`, merged.join('\n'));
        console.log('💿 Loaded speakers from DB/cache:', merged);
      }
    } catch (e) {
      console.warn('⚠️ Failed loading speakers from DB:', e);
    }
  };

  // Keep available speakers in sync with props
  useEffect(() => {
    const initOrMergeSpeakers = async () => {
      if (existingSpeakers && existingSpeakers.length > 0) {
        const unique = Array.from(new Set(existingSpeakers.filter(Boolean))).sort();
        // Merge with any previously stabilized list to avoid flicker
        const stable = (sessionStorage.getItem(`speakers_${videoId}_${language}`)?.split('\n') || []).filter(Boolean);
        const merged = Array.from(new Set([...stable, ...unique])).sort();
        setAvailableSpeakers(merged);
        sessionStorage.setItem(`speakers_${videoId}_${language}`, merged.join('\n'));
        console.log('🧩 Available speakers (from props, stabilized):', merged);
        console.log('🔍 Debugging speakers - Total provided:', existingSpeakers.length, 'Unique filtered:', unique.length);
        console.log('🔍 Final mapping gate debug:', {
          mapping: speakerMappings,
          charactersCount: characters.length,
          byName: characters.map(c => c.name),
          sampleSpeakers: merged.slice(0, 5)
        });
      } else {
        // No speakers provided – load from cache and DB to build a stable list
        await loadCachedSpeakerData();
        await loadSpeakersFromDB();
      }
    };
    initOrMergeSpeakers();
  }, [existingSpeakers, videoId, language]);

  // Load speaker mappings from database on mount
  // Track if we've loaded mappings for this video/language once to avoid overwriting user selections on re-renders
  const loadedMappingsKeyRef = useRef<string | null>(null);


  useEffect(() => {
    const key = `${videoId}:${language}`;
    if (loadedMappingsKeyRef.current === key) return;
    loadedMappingsKeyRef.current = key;

    const loadMappingsFromDatabase = async () => {
      try {
        // First, try to load from speaker_mappings table
        const mappings = await loadSpeakerMappings(language);
        
        // Reconstruct mappings from transcript_segments with character_id
        const { data: segments } = await supabase
          .from('transcript_segments_clean')
          .select('speaker, character_id')
          .eq('video_id', videoId)
          .eq('language', language)
          .not('character_id', 'is', null);
        
        if (segments && segments.length > 0) {
          // Get character details
          const charIds = Array.from(new Set(segments.map(s => s.character_id).filter(Boolean)));
          const { data: chars } = await supabase
            .from('characters')
            .select('id, name')
            .in('id', charIds);
          
          const charMap = new Map(chars?.map(c => [c.id, c.name]) || []);
          
          // Auto-populate: Reconstruct speaker -> character mapping from character_id links
          const autoMappings: Record<string, string> = {};
          for (const seg of segments) {
            if (seg.character_id && seg.speaker) {
              const charName = charMap.get(seg.character_id);
              if (charName) {
                autoMappings[seg.speaker] = charName;
              }
            }
          }
          
          // Merge with loaded mappings (prefer auto-reconstructed as current state)
          const finalMappings = { ...mappings, ...autoMappings };
          setSpeakerMappings(finalMappings);
          console.log('✅ Auto-populated speaker mappings:', finalMappings);
        } else {
          setSpeakerMappings(mappings || {});
        }
      } catch (error) {
        console.error('Failed to load speaker mappings:', error);
      }
    };
    
    loadMappingsFromDatabase();
  }, [videoId, language]);

  // Get all available colors for character type (not filtered by usage)
  const getAllColorsForType = (type: Character['type']) => {
    switch (type) {
      case 'hero':
      case 'villain':
      case 'main':
        return Object.entries(CI_COLORS.main)
          .map(([name, color]) => ({ name: `${name} (Main)`, color }));
      
      case 'supporting':
        return Object.entries(CI_COLORS.supporting)
          .map(([name, color]) => ({ name: `${name} (Supporting)`, color }));
      
      case 'minor':
        return CI_COLORS.minor
          .map((color, index) => ({ name: `Pastel ${index + 1} (Minor)`, color }));
      
      default:
        return [];
    }
  };

  // Get available colors for adding new character (filtered by usage)
  const getAvailableColorsForNewCharacter = (type: Character['type']) => {
    const usedColors = characters.map(c => c.color);
    return getAllColorsForType(type).filter(({ color }) => !usedColors.includes(color));
  };

  const addCharacter = () => {
    if (!newCharacterName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a character name",
        variant: "destructive"
      });
      return;
    }

    const availableColors = getAvailableColorsForNewCharacter(newCharacterType);
    if (availableColors.length === 0) {
      toast({
        title: "No Colors Available",
        description: `No more colors available for ${newCharacterType} characters`,
        variant: "destructive"
      });
      return;
    }

    const newCharacter: Character = {
      id: `char-${Date.now()}`,
      name: newCharacterName.trim(),
      type: newCharacterType,
      color: availableColors[0].color,
      isOffCamera: false,
      emphasis: 'normal',
      pitch: 'normal'
    };

    const updatedCharacters = [...characters, newCharacter];
    setCharacters(updatedCharacters);
    setNewCharacterName('');

    toast({
      title: "Character Added",
      description: `${newCharacter.name} assigned color ${availableColors[0].name}. Don't forget to save changes.`
    });
  };

  const saveAllCharacters = async () => {
    try {
      // 1. Save characters to database
      await saveCharacters(characters);
      
      // 2. Save speaker mappings to database
      await saveSpeakerMappings(speakerMappings, language);
      
      // 3. Update localStorage for instant access (critical for video player)
      const characterColorMap = characters.reduce((acc, char) => ({ 
        ...acc, 
        [char.name]: char.color 
      }), {});
      
      localStorage.setItem('character-colors', JSON.stringify(characterColorMap));
      
      // 4. Trigger parent component update 
      onCharactersUpdate?.(characters);
      
      // 5. CRITICAL: Apply character settings to all segments in database
      // This MUST complete before dispatching events
      await applyCharacterMappings();
      
      toast({
        title: "Colors synchronized!",
        description: `${characters.length} characters saved and colors synced across video player and transcript`,
        variant: "default"
      });
    } catch (error) {
      console.error('❌ Failed to save characters:', error);
      toast({
        title: "Save failed",
        description: "Failed to save characters. Please try again.",
        variant: "destructive"
      });
    }
  };

  const applyCharacterMappings = async () => {
    try {
      // Type mapping to ensure valid database values
      const typeMapping: Record<string, string> = {
        'main': 'main',
        'supporting': 'supporting',
        'villain': 'minor', // Map villain to minor (valid DB type)
        'minor': 'minor'
      };
      
      // First, save characters to database and get their IDs
      const { data: savedChars, error: saveError } = await supabase
        .from('characters')
        .upsert(
          characters.map(char => ({
            id: char.id.startsWith('char-') ? undefined : char.id,
            video_id: videoId,
            name: char.name,
            type: typeMapping[char.type] ?? 'minor',
            color: char.color,
            is_off_camera: char.isOffCamera || false,
            voice_id: char.voiceId,
            voice_name: char.voiceName,
            voice_type: char.voiceType,
            emphasis: char.emphasis || 'normal',
            pitch: char.pitch || 'normal'
          })),
          { onConflict: 'video_id,name', ignoreDuplicates: false }
        )
        .select();
      
      if (saveError) {
        console.error('❌ Failed to save characters:', saveError);
        throw saveError;
      }
      
      // Create a map of character names to IDs
      const charIdMap = new Map(savedChars?.map(c => [c.name, c.id]) || []);
      
      // Build mappings object for RPC (speaker -> character_id)
      const mappingsForRPC: Record<string, string> = {};
      for (const [speakerName, characterName] of Object.entries(speakerMappings)) {
        const characterId = charIdMap.get(characterName);
        if (characterId) {
          mappingsForRPC[speakerName] = characterId;
        }
      }
      
      // Get all transcript languages for this video
      const { data: transcripts } = await supabase
        .from('transcripts')
        .select('language')
        .eq('video_id', videoId);
      
      const allLanguages = Array.from(new Set(transcripts?.map(t => t.language) || [language]));
      
      // Apply mappings for each language using existing RPC
      for (const lang of allLanguages) {
        for (const [speakerLabel, charId] of Object.entries(mappingsForRPC)) {
          const { error } = await supabase.rpc('apply_specific_mapping', {
            p_video_id: videoId,
            p_language: lang,
            p_asr_label: speakerLabel,
            p_character_id: charId
          });
          
          if (error) {
            console.error(`❌ [${lang}] Failed to apply mapping for ${speakerLabel}:`, error);
            throw error;
          }
        }
        
        console.log(`✅ [${lang}] Applied all character mappings`);
      }
      
      // ONE event after ALL database updates are complete
      window.dispatchEvent(new CustomEvent('character-colors-updated'));
      
    } catch (error) {
      console.error('❌ Failed to apply character mappings:', error);
      throw error;
    }
  };

  const removeCharacter = (characterId: string) => {
    const updatedCharacters = characters.filter(c => c.id !== characterId);
    setCharacters(updatedCharacters);
  };

  const updateCharacterProperty = (characterId: string, property: keyof Character, value: any) => {
    const updatedCharacters = characters.map(c =>
      c.id === characterId ? { ...c, [property]: value } : c
    );
    setCharacters(updatedCharacters);
  };

  const updateCharacterVoice = (characterId: string, voiceId: string, voiceName: string, voiceType: 'elevenlabs' | 'native') => {
    updateCharacterProperty(characterId, 'voiceId', voiceId);
    updateCharacterProperty(characterId, 'voiceName', voiceName);
    updateCharacterProperty(characterId, 'voiceType', voiceType);
  };

  const updateSpeakerMapping = (speakerName: string, characterName: string) => {
    setSpeakerMappings(prev => {
      const updated = { ...prev };
      if (characterName === "unassigned") {
        delete updated[speakerName];
      } else {
        updated[speakerName] = characterName;
      }
      return updated;
    });
  };

  // Helper: get which detected speaker is currently mapped to a character
  const getMappedSpeakerForCharacter = (characterName: string): string => {
    return Object.keys(speakerMappings).find(sp => speakerMappings[sp] === characterName) || 'unassigned';
  };

  // Helper: update mapping by selecting a detected speaker for a character
  const updateMappingForCharacter = (characterName: string, selectedSpeaker: string) => {
    setSpeakerMappings(prev => {
      const next: Record<string, string> = {};
      // Remove any previous mapping to this character
      for (const [sp, ch] of Object.entries(prev)) {
        if (ch !== characterName) next[sp] = ch;
      }
      // Set new mapping if not unassigned
      if (selectedSpeaker !== 'unassigned') {
        next[selectedSpeaker] = characterName;
      }
      return next;
    });
  };

  const getCharacterTypeIcon = (type: Character['type']) => {
    switch (type) {
      case 'hero': return <Crown className="w-4 h-4" />;
      case 'villain': return <Crown className="w-4 h-4 text-red-500" />;
      case 'main': return <Star className="w-4 h-4" />;
      case 'supporting': return <Users className="w-4 h-4" />;
      case 'minor': return <Users className="w-4 h-4 opacity-60" />;
    }
  };

  const getCharactersByType = (type: Character['type']) => 
    characters.filter(c => c.type === type);

  return (
    <Card className="w-full rounded-xl shadow-soft border">
      <CardHeader>
        <CardTitle className="text-2xl font-light text-foreground flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Character Color Attribution
        </CardTitle>
        <Card className="border-primary/20 bg-primary/5 mt-3 rounded-xl">
          <CardContent className="p-4">
            <p className="text-base font-light leading-relaxed">
              Assign colors to characters following the Captions with Intention protocol.
            </p>
          </CardContent>
        </Card>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Speaker Mapping Section */}
        {characters.length > 0 && (
          <Card className="border-orange-200/50 bg-orange-50/30 rounded-xl">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-lg font-light text-orange-800">
                Speaker Assignment
              </h4>
              <p className="text-base font-light leading-relaxed text-orange-700">
                Map each character to a detected transcript speaker. Colors come from Character Management. You can still edit text and intonation word-by-word in the transcript editor.
              </p>
              <div className="text-sm font-light text-orange-600 bg-orange-100/80 p-3 rounded-lg border border-orange-200">
                <strong>Status:</strong> {characters.length} characters • {availableSpeakers.length} detected speakers
              </div>
              <div className="space-y-2">
              {characters.map((char) => {
                const mappedSpeaker = Object.keys(speakerMappings).find(sp => speakerMappings[sp] === char.name) || 'unassigned';
                return (
                  <div key={char.id} className="flex items-center gap-3 text-sm">
                    <Badge variant="outline" className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: char.color }} />
                        {char.name} ({char.type})
                      </div>
                    </Badge>
                    <span className="text-muted-foreground">→</span>
                    <div className="flex items-center gap-2">
                      <Select 
                        value={mappedSpeaker}
                        onValueChange={(value) => {
                          // Remove any existing mapping pointing to this character, then (optionally) set the new one
                          setSpeakerMappings(prev => {
                            const next: Record<string, string> = {};
                            for (const [sp, ch] of Object.entries(prev)) {
                              if (ch !== char.name) next[sp] = ch;
                            }
                            if (value !== 'unassigned') next[value] = char.name;
                            return next;
                          });
                        }}
                      >
                        <SelectTrigger className="h-7 w-56">
                          <SelectValue placeholder="Select detected speaker..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {Array.from(new Set([...availableSpeakers, ...Object.keys(speakerMappings)])).sort().map(sp => (
                            <SelectItem key={sp} value={sp}>{sp}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
            </CardContent>
          </Card>
        )}


        <Card className="border-accent/30 bg-accent/5 rounded-xl">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-lg font-light text-foreground">Character Management</h4>
                <p className="text-base text-muted-foreground font-light leading-relaxed">Configure character colors, voices, and speech patterns</p>
              </div>
              <Button onClick={saveAllCharacters} size="sm" variant="default" className="font-light">
                <Save className="w-4 h-4 mr-2" />
                Save All Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Add New Character */}
        <Card className="border-accent/30 bg-accent/5 rounded-xl">
          <CardContent className="p-4 space-y-3">
            <h4 className="text-lg font-light text-foreground flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add New Character
            </h4>
            <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-sm font-light">Name</Label>
              <Input
                value={newCharacterName}
                onChange={(e) => setNewCharacterName(e.target.value)}
                placeholder="Character name"
                className="h-8"
                onKeyPress={(e) => e.key === 'Enter' && addCharacter()}
              />
            </div>
            <div>
              <Label className="text-sm font-light">Type</Label>
              <Select value={newCharacterType} onValueChange={(value) => setNewCharacterType(value as Character['type'])}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50 shadow-lg">
                  <SelectItem value="hero">Hero (Main)</SelectItem>
                  <SelectItem value="villain">Villain (Main)</SelectItem>
                  <SelectItem value="main">Main Character</SelectItem>
                  <SelectItem value="supporting">Supporting</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={addCharacter} size="sm" className="h-8 font-light">
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>
          </div>
          </CardContent>
        </Card>

        {/* Character Lists by Type */}
        {['main', 'supporting', 'minor'].map(type => {
          const typeCharacters = getCharactersByType(type as Character['type']);
          if (typeCharacters.length === 0) return null;

          return (
            <div key={type} className="space-y-2">
              <h4 className="text-lg font-light capitalize flex items-center gap-2">
                {getCharacterTypeIcon(type as Character['type'])}
                {type} Characters
              </h4>
              <div className="space-y-4">
                {typeCharacters.map(character => {
                  return (
                    <div key={character.id} className="p-4 bg-accent/5 rounded-xl border space-y-4">
                      {/* Character Header */}
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded border-2 border-gray-300 flex-shrink-0"
                          style={{ backgroundColor: character.color }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Input
                              value={character.name}
                              onChange={(e) => updateCharacterProperty(character.id, 'name', e.target.value)}
                              className="h-8 min-w-[120px] font-medium"
                              placeholder="Character name"
                            />
                            {character.isOffCamera && (
                              <Badge variant="secondary" className="text-xs">Off-camera</Badge>
                            )}
                            {character.voiceName && (
                              <Badge variant="outline" className="text-xs">
                                <Volume2 className="w-3 h-3 mr-1" />
                                {character.voiceName}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeCharacter(character.id)}
                          className="h-8 px-2 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                       {/* Character Properties Grid */}
                       <div className="grid grid-cols-3 gap-4">
                         {/* Character Type */}
                         <div className="space-y-2">
                           <Label className="text-sm font-light">Character Type</Label>
                           <Select
                             value={character.type}
                             onValueChange={(type) => {
                               updateCharacterProperty(character.id, 'type', type);
                               // Auto-assign first available color for new type
                               const colorsForType = getAllColorsForType(type as Character['type']);
                               if (colorsForType.length > 0) {
                                 updateCharacterProperty(character.id, 'color', colorsForType[0].color);
                               }
                             }}
                           >
                             <SelectTrigger className="h-8">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="hero">Hero</SelectItem>
                               <SelectItem value="villain">Villain</SelectItem>
                               <SelectItem value="main">Main Character</SelectItem>
                               <SelectItem value="supporting">Supporting</SelectItem>
                               <SelectItem value="minor">Minor</SelectItem>
                             </SelectContent>
                           </Select>
                         </div>

                         {/* Color Selection */}
                         <div className="space-y-2">
                           <Label className="text-sm font-light">Color</Label>
                           <Select
                             value={character.color}
                             onValueChange={(color) => updateCharacterProperty(character.id, 'color', color)}
                           >
                             <SelectTrigger className="h-8">
                               <SelectValue />
                             </SelectTrigger>
                              <SelectContent className="max-h-60 bg-background z-50 shadow-lg">
                                {getAllColorsForType(character.type).map(({ name, color }) => (
                                  <SelectItem key={color} value={color}>
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-4 h-4 rounded border"
                                        style={{ backgroundColor: color }}
                                      />
                                      {name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                           </Select>
                         </div>

                         {/* Off-Camera Toggle */}
                         <div className="space-y-2">
                           <Label className="text-sm font-light">Camera Status</Label>
                           <Button
                             size="sm"
                             variant={character.isOffCamera ? "default" : "outline"}
                             onClick={() => updateCharacterProperty(character.id, 'isOffCamera', !character.isOffCamera)}
                             className="h-8 w-full font-light"
                           >
                             {character.isOffCamera ? 'Off-Camera' : 'On-Camera'}
                           </Button>
                         </div>
                       </div>

                       {/* Speech Properties */}
                       <div className="grid grid-cols-2 gap-4">
                         {/* Emphasis */}
                         <div className="space-y-2">
                           <Label className="text-sm font-light">Emphasis</Label>
                           <Select
                             value={character.emphasis || 'normal'}
                             onValueChange={(emphasis) => updateCharacterProperty(character.id, 'emphasis', emphasis)}
                           >
                             <SelectTrigger className="h-8">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="quiet">Quiet</SelectItem>
                               <SelectItem value="normal">Normal</SelectItem>
                               <SelectItem value="loud">Loud</SelectItem>
                             </SelectContent>
                           </Select>
                         </div>

                         {/* Pitch */}
                         <div className="space-y-2">
                           <Label className="text-sm font-light">Pitch</Label>
                           <Select
                             value={character.pitch || 'normal'}
                             onValueChange={(pitch) => updateCharacterProperty(character.id, 'pitch', pitch)}
                           >
                             <SelectTrigger className="h-8">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="low">Low</SelectItem>
                               <SelectItem value="normal">Normal</SelectItem>
                               <SelectItem value="high">High</SelectItem>
                             </SelectContent>
                           </Select>
                         </div>
                       </div>

                      {/* Voice Selection */}
                      <div className="space-y-2">
                        <Label className="text-sm font-light">Voice Assignment</Label>
                        <VoiceSelector
                          selectedVoiceId={character.voiceId}
                          onVoiceSelect={(voiceId, voiceName, voiceType) => 
                            updateCharacterVoice(character.id, voiceId, voiceName, voiceType)
                          }
                          language={language} // Use project language for voice filtering
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {characters.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-base font-light">No characters added yet</p>
            <p className="text-sm font-light">Add characters to enable color-coded captions</p>
          </div>
        )}

        {/* Color Guidelines */}
        <Separator />
        <div className="text-sm text-muted-foreground space-y-2 font-light">
          <h5 className="text-base font-light text-foreground">Color Guidelines:</h5>
          <ul className="space-y-1 pl-4 leading-relaxed">
            <li>• Main characters use the 6 primary spectrum colors</li>
            <li>• Supporting characters use colors between main character colors</li>
            <li>• Minor characters use pastel tones from the center of the color wheel</li>
            <li>• Hero and Villain should be positioned opposite on the spectrum</li>
            <li>• Off-camera dialogue is displayed in italic</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

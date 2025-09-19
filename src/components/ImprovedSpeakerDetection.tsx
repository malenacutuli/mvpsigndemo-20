import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Users, Mic, Eye, EyeOff, Plus, Save, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useVideoStorage } from '@/hooks/useVideoStorage';

// CI Color palette for character assignments
const CI_CHARACTER_COLORS = {
  main: ['#3B82F6', '#10B981', '#F59E0B'], // Blue, Green, Amber for main characters
  supporting: ['#8B5CF6', '#EC4899', '#06B6D4'], // Purple, Pink, Cyan for supporting
  minor: ['#84CC16', '#F97316', '#EF4444'] // Lime, Orange, Red for minor characters
};

interface Character {
  id?: string;
  name: string;
  type: 'main' | 'supporting' | 'minor';
  color: string;
  isOffCamera?: boolean;
  segmentCount?: number;
}

interface ImprovedSpeakerDetectionProps {
  videoId: string;
  videoUrl: string;
  onCharactersUpdated?: (characters: Character[]) => void;
}

export const ImprovedSpeakerDetection: React.FC<ImprovedSpeakerDetectionProps> = ({
  videoId,
  videoUrl,
  onCharactersUpdated
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedSpeakers, setDetectedSpeakers] = useState<Array<{
    id: string;
    segmentCount: number;
    averageDuration: number;
    confidence: number;
  }>>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [speakerMappings, setSpeakerMappings] = useState<Record<string, string>>({});
  const [newCharacterName, setNewCharacterName] = useState('');
  const [newCharacterType, setNewCharacterType] = useState<'main' | 'supporting' | 'minor'>('main');
  
  const { toast } = useToast();
  const { loadCharacters, saveCharacters, loadSpeakerMappings, saveSpeakerMappings } = useVideoStorage(videoId);

  React.useEffect(() => {
    loadExistingData();
  }, [videoId]);

  const loadExistingData = async () => {
    try {
      const [existingCharacters, existingMappings] = await Promise.all([
        loadCharacters(),
        loadSpeakerMappings()
      ]);
      
      if (existingCharacters.length > 0) {
        setCharacters(existingCharacters);
      }
      
      if (existingMappings && Object.keys(existingMappings).length > 0) {
        setSpeakerMappings(existingMappings);
      }
    } catch (error) {
      console.error('Failed to load existing data:', error);
    }
  };

  const runAdvancedSpeakerDetection = async () => {
    setIsAnalyzing(true);
    try {
      // Call the improved speaker diarization function
      const { data, error } = await supabase.functions.invoke('speaker-diarization', {
        body: { 
          videoId,
          videoUrl,
          analysisDepth: 'advanced', // Request deeper analysis
          minSpeakerDuration: 2, // Minimum 2 seconds to count as separate speaker
          confidenceThreshold: 0.7 // Higher confidence threshold
        }
      });

      if (error) throw error;

      // Process the results to identify distinct speakers
      const speakers = data?.speakers || [];
      const mappings = data?.speakerMappings || {};
      
      setDetectedSpeakers(speakers);
      setSpeakerMappings(mappings);
      
      // Auto-suggest character assignments based on speaking patterns
      const suggestedCharacters = await generateCharacterSuggestions(speakers);
      setCharacters(prev => {
        const existing = new Set(prev.map(c => c.name));
        const newSuggestions = suggestedCharacters.filter(s => !existing.has(s.name));
        return [...prev, ...newSuggestions];
      });

      toast({
        title: "Speaker Detection Complete",
        description: `Found ${speakers.length} distinct speakers with improved accuracy`
      });

    } catch (error) {
      console.error('Speaker detection failed:', error);
      toast({
        title: "Detection Failed",
        description: error instanceof Error ? error.message : "Failed to detect speakers",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateCharacterSuggestions = async (speakers: any[]): Promise<Character[]> => {
    // Analyze speaking patterns to suggest character types and names
    const suggestions: Character[] = [];
    
    speakers.forEach((speaker, index) => {
      let type: 'main' | 'supporting' | 'minor' = 'minor';
      let suggestedName = `Speaker ${index + 1}`;
      
      // Determine character type based on speaking time
      if (speaker.segmentCount > 50 || speaker.averageDuration > 5) {
        type = 'main';
        suggestedName = ['Host', 'Narrator', 'Teacher', 'Chef'][index] || `Main Character ${index + 1}`;
      } else if (speaker.segmentCount > 20 || speaker.averageDuration > 3) {
        type = 'supporting';
        suggestedName = ['Expert', 'Guest', 'Assistant', 'Student'][index] || `Supporting Character ${index + 1}`;
      } else {
        type = 'minor';
        suggestedName = ['Announcer', 'Viewer', 'Photographer', 'Housekeeper'][index] || `Minor Character ${index + 1}`;
      }
      
      // Assign appropriate color based on type
      const colorOptions = CI_CHARACTER_COLORS[type];
      const color = colorOptions[index % colorOptions.length];
      
      suggestions.push({
        name: suggestedName,
        type,
        color,
        segmentCount: speaker.segmentCount
      });
    });
    
    return suggestions;
  };

  const addCharacter = () => {
    if (!newCharacterName.trim()) return;
    
    const colorOptions = CI_CHARACTER_COLORS[newCharacterType];
    const existingColors = characters.map(c => c.color);
    const availableColor = colorOptions.find(color => !existingColors.includes(color)) || colorOptions[0];
    
    const newCharacter: Character = {
      name: newCharacterName.trim(),
      type: newCharacterType,
      color: availableColor,
      isOffCamera: false
    };
    
    setCharacters(prev => [...prev, newCharacter]);
    setNewCharacterName('');
    
    toast({
      title: "Character Added",
      description: `Added ${newCharacter.name} as ${newCharacterType} character`
    });
  };

  const updateCharacter = (index: number, updates: Partial<Character>) => {
    setCharacters(prev => prev.map((char, i) => 
      i === index ? { ...char, ...updates } : char
    ));
  };

  const removeCharacter = (index: number) => {
    const character = characters[index];
    setCharacters(prev => prev.filter((_, i) => i !== index));
    
    toast({
      title: "Character Removed",
      description: `Removed ${character.name}`
    });
  };

  const assignSpeakerToCharacter = (speakerId: string, characterName: string) => {
    setSpeakerMappings(prev => ({
      ...prev,
      [speakerId]: characterName
    }));
  };

  const saveAllChanges = async () => {
    try {
      // Save characters to database
      await saveCharacters(characters);
      
      // Save speaker mappings
      await saveSpeakerMappings(speakerMappings);
      
      // Apply mappings to transcript segments
      await applyCharacterMappingsToSegments();
      
      // Notify parent component
      onCharactersUpdated?.(characters);
      
      toast({
        title: "Changes Saved",
        description: "Character assignments and mappings saved successfully"
      });
      
    } catch (error) {
      console.error('Failed to save changes:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save character assignments",
        variant: "destructive"
      });
    }
  };

  const applyCharacterMappingsToSegments = async () => {
    // Update all transcript segments with proper character names and colors
    for (const [speakerId, characterName] of Object.entries(speakerMappings)) {
      const character = characters.find(c => c.name === characterName);
      if (character) {
        const { error } = await supabase
          .from('transcript_segments')
          .update({
            speaker: characterName,
            speaker_color: character.color,
            is_off_camera: character.isOffCamera || false
          })
          .eq('video_id', videoId)
          .eq('speaker', speakerId);
        
        if (error) {
          console.error(`Failed to update segments for ${speakerId}:`, error);
        }
      }
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Improved Speaker Detection & Character Assignment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Detection Controls */}
        <div className="flex gap-3">
          <Button
            onClick={runAdvancedSpeakerDetection}
            disabled={isAnalyzing}
            className="flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Run Advanced Detection
              </>
            )}
          </Button>
          
          <Button
            onClick={saveAllChanges}
            variant="default"
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save All Changes
          </Button>
        </div>

        {/* Detected Speakers */}
        {detectedSpeakers.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Detected Speakers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {detectedSpeakers.map((speaker, index) => (
                <div key={speaker.id} className="p-3 border rounded-lg bg-muted/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{speaker.id}</span>
                    <Badge variant="outline">
                      {speaker.segmentCount} segments
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-3">
                    Avg Duration: {speaker.averageDuration.toFixed(1)}s • 
                    Confidence: {(speaker.confidence * 100).toFixed(1)}%
                  </div>
                  
                  <Select 
                    value={speakerMappings[speaker.id] || ''} 
                    onValueChange={(value) => assignSpeakerToCharacter(speaker.id, value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Assign character" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-md z-50">
                      {characters.map(character => (
                        <SelectItem key={character.name} value={character.name}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full border" 
                              style={{ backgroundColor: character.color }}
                            />
                            {character.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Character Management */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Character Definitions</h3>
          
          {/* Add New Character */}
          <div className="p-4 border rounded-lg bg-muted/10">
            <h4 className="font-medium mb-3">Add New Character</h4>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label className="text-sm">Character Name</Label>
                <Input
                  value={newCharacterName}
                  onChange={(e) => setNewCharacterName(e.target.value)}
                  placeholder="e.g., David, Rick, Housekeeper"
                  className="mt-1"
                />
              </div>
              <div className="w-32">
                <Label className="text-sm">Type</Label>
                <Select value={newCharacterType} onValueChange={(value) => setNewCharacterType(value as any)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-md z-50">
                    <SelectItem value="main">Main</SelectItem>
                    <SelectItem value="supporting">Supporting</SelectItem>
                    <SelectItem value="minor">Minor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addCharacter} disabled={!newCharacterName.trim()}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Character List */}
          <div className="space-y-3">
            {characters.map((character, index) => (
              <div key={character.name} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full border-2" 
                      style={{ backgroundColor: character.color }}
                    />
                    <div>
                      <span className="font-medium">{character.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {character.type}
                      </Badge>
                      {character.segmentCount && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {character.segmentCount} segments
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateCharacter(index, { isOffCamera: !character.isOffCamera })}
                      className="h-8 w-8 p-0"
                    >
                      {character.isOffCamera ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeCharacter(index)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">How to Improve Speaker Detection:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Run advanced detection to identify all speakers with higher accuracy</li>
            <li>• Add all characters you expect to find (including off-camera speakers)</li>
            <li>• Assign detected speakers to the correct character names</li>
            <li>• Use character types (Main/Supporting/Minor) to organize roles</li>
            <li>• Save changes to apply character names and colors to all transcript segments</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
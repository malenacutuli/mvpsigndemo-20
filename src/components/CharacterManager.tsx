import React, { useState, useEffect } from 'react';
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
}

interface CharacterManagerProps {
  videoId: string;
  onCharactersUpdate?: (characters: Character[]) => void;
  existingCharacters?: Character[];
}

export const CharacterManager: React.FC<CharacterManagerProps> = ({ 
  videoId, 
  onCharactersUpdate, 
  existingCharacters = [] 
}) => {
  const [characters, setCharacters] = useState<Character[]>(existingCharacters);
  const [newCharacterName, setNewCharacterName] = useState('');
  const [newCharacterType, setNewCharacterType] = useState<Character['type']>('main');
  const { saveCharacters, loadCharacters } = useVideoStorage(videoId);

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

  // Get available colors based on character type
  const getAvailableColors = (type: Character['type']) => {
    const usedColors = characters.map(c => c.color);
    
    switch (type) {
      case 'hero':
      case 'villain':
      case 'main':
        return Object.entries(CI_COLORS.main)
          .map(([name, color]) => ({ name, color }))
          .filter(({ color }) => !usedColors.includes(color));
      
      case 'supporting':
        return Object.entries(CI_COLORS.supporting)
          .map(([name, color]) => ({ name, color }))
          .filter(({ color }) => !usedColors.includes(color));
      
      case 'minor':
        return CI_COLORS.minor
          .map((color, index) => ({ name: `minor-${index + 1}`, color }))
          .filter(({ color }) => !usedColors.includes(color));
      
      default:
        return [];
    }
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

    const availableColors = getAvailableColors(newCharacterType);
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
    
    // Auto-save new character
    setTimeout(async () => {
      try {
        await saveCharacters(updatedCharacters);
        onCharactersUpdate?.(updatedCharacters);
      } catch (error) {
        console.error('Auto-save failed for new character:', error);
      }
    }, 500);

    toast({
      title: "Character Added",
      description: `${newCharacter.name} has been added and will be saved automatically.`
    });
  };

  const saveAllCharacters = async () => {
    try {
      await saveCharacters(characters);
      onCharactersUpdate?.(characters);
      toast({
        title: "Characters Saved",
        description: "All character settings have been saved and applied to the video."
      });
    } catch (error) {
      console.error('Failed to save characters:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save characters. Please try again.",
        variant: "destructive"
      });
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
    
    // Auto-save characters after a brief delay to avoid too many saves during rapid editing
    setTimeout(async () => {
      try {
        await saveCharacters(updatedCharacters);
        onCharactersUpdate?.(updatedCharacters);
      } catch (error) {
        console.error('Auto-save failed for characters:', error);
      }
    }, 1000);
  };

  const updateCharacterVoice = (characterId: string, voiceId: string, voiceName: string, voiceType: 'elevenlabs' | 'native') => {
    updateCharacterProperty(characterId, 'voiceId', voiceId);
    updateCharacterProperty(characterId, 'voiceName', voiceName);
    updateCharacterProperty(characterId, 'voiceType', voiceType);
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Character Color Attribution
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Assign colors to characters following the Captions with Intention protocol
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Save Changes Button */}
        <div className="flex justify-between items-center p-4 bg-accent/10 rounded-lg">
          <div>
            <h4 className="font-medium">Character Management</h4>
            <p className="text-xs text-muted-foreground">Configure character colors, voices, and speech patterns</p>
          </div>
          <Button onClick={saveAllCharacters} size="sm" variant="default">
            <Save className="w-4 h-4 mr-2" />
            Save All Changes
          </Button>
        </div>

        {/* Add New Character */}
        <div className="space-y-3 p-4 bg-accent/10 rounded-lg">
          <h4 className="font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add New Character
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                value={newCharacterName}
                onChange={(e) => setNewCharacterName(e.target.value)}
                placeholder="Character name"
                className="h-8"
                onKeyPress={(e) => e.key === 'Enter' && addCharacter()}
              />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={newCharacterType} onValueChange={(value) => setNewCharacterType(value as Character['type'])}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hero">Hero (Main)</SelectItem>
                  <SelectItem value="villain">Villain (Main)</SelectItem>
                  <SelectItem value="main">Main Character</SelectItem>
                  <SelectItem value="supporting">Supporting</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={addCharacter} size="sm" className="h-8">
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Character Lists by Type */}
        {['main', 'supporting', 'minor'].map(type => {
          const typeCharacters = getCharactersByType(type as Character['type']);
          if (typeCharacters.length === 0) return null;

          return (
            <div key={type} className="space-y-2">
              <h4 className="font-medium capitalize flex items-center gap-2">
                {getCharacterTypeIcon(type as Character['type'])}
                {type} Characters
              </h4>
              <div className="space-y-4">
                {typeCharacters.map(character => {
                  const availableColors = getAvailableColors(character.type);
                  return (
                    <div key={character.id} className="p-4 bg-accent/5 rounded border space-y-4">
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
                      <div className="grid grid-cols-2 gap-4">
                        {/* Color Selection */}
                        <div className="space-y-2">
                          <Label className="text-xs">Color</Label>
                          <Select
                            value={character.color}
                            onValueChange={(color) => updateCharacterProperty(character.id, 'color', color)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableColors.concat([{ name: 'current', color: character.color }]).map(({ name, color }) => (
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

                        {/* Emphasis */}
                        <div className="space-y-2">
                          <Label className="text-xs">Emphasis</Label>
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
                          <Label className="text-xs">Pitch</Label>
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

                        {/* Off-Camera Toggle */}
                        <div className="space-y-2">
                          <Label className="text-xs">Camera Status</Label>
                          <Button
                            size="sm"
                            variant={character.isOffCamera ? "default" : "outline"}
                            onClick={() => updateCharacterProperty(character.id, 'isOffCamera', !character.isOffCamera)}
                            className="h-8 w-full"
                          >
                            {character.isOffCamera ? 'Off-Camera' : 'On-Camera'}
                          </Button>
                        </div>
                      </div>

                      {/* Voice Selection */}
                      <div className="space-y-2">
                        <Label className="text-xs">Voice Assignment</Label>
                        <VoiceSelector
                          selectedVoiceId={character.voiceId}
                          onVoiceSelect={(voiceId, voiceName, voiceType) => 
                            updateCharacterVoice(character.id, voiceId, voiceName, voiceType)
                          }
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
            <p>No characters added yet</p>
            <p className="text-sm">Add characters to enable color-coded captions</p>
          </div>
        )}

        {/* Color Guidelines */}
        <Separator />
        <div className="text-xs text-muted-foreground space-y-2">
          <h5 className="font-medium text-foreground">Color Guidelines:</h5>
          <ul className="space-y-1 pl-4">
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
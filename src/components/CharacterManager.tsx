import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Crown, Star, Users, Palette } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

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
      isOffCamera: false
    };

    const updatedCharacters = [...characters, newCharacter];
    setCharacters(updatedCharacters);
    setNewCharacterName('');
    onCharactersUpdate?.(updatedCharacters);

    // Save to localStorage
    localStorage.setItem(`characters-${videoId}`, JSON.stringify(updatedCharacters));

    toast({
      title: "Character Added",
      description: `${newCharacter.name} assigned color ${availableColors[0].name}`
    });
  };

  const removeCharacter = (characterId: string) => {
    const updatedCharacters = characters.filter(c => c.id !== characterId);
    setCharacters(updatedCharacters);
    onCharactersUpdate?.(updatedCharacters);
    
    // Save to localStorage
    localStorage.setItem(`characters-${videoId}`, JSON.stringify(updatedCharacters));
  };

  const updateCharacterColor = (characterId: string, newColor: string) => {
    const updatedCharacters = characters.map(c =>
      c.id === characterId ? { ...c, color: newColor } : c
    );
    setCharacters(updatedCharacters);
    
    // Immediately notify parent to update video player
    console.log('🎨 Character color updated, applying to video player');
    onCharactersUpdate?.(updatedCharacters);
    
    // Save to localStorage
    localStorage.setItem(`characters-${videoId}`, JSON.stringify(updatedCharacters));
  };

  const toggleOffCamera = (characterId: string) => {
    const updatedCharacters = characters.map(c =>
      c.id === characterId ? { ...c, isOffCamera: !c.isOffCamera } : c
    );
    setCharacters(updatedCharacters);
    
    // Immediately notify parent to update video player
    console.log('📷 Character off-camera status updated, applying to video player');
    onCharactersUpdate?.(updatedCharacters);
    
    // Save to localStorage
    localStorage.setItem(`characters-${videoId}`, JSON.stringify(updatedCharacters));
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
              <div className="space-y-2">
                {typeCharacters.map(character => {
                  const availableColors = getAvailableColors(character.type);
                  return (
                    <div key={character.id} className="flex items-center gap-3 p-3 bg-accent/5 rounded border">
                      <div 
                        className="w-8 h-8 rounded border-2 border-gray-300 flex-shrink-0"
                        style={{ backgroundColor: character.color }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{character.name}</span>
                          {character.isOffCamera && (
                            <Badge variant="secondary" className="text-xs">Off-camera</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Color: {character.color}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={character.color}
                          onValueChange={(color) => updateCharacterColor(character.id, color)}
                        >
                          <SelectTrigger className="h-8 w-32">
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
                        <Button
                          size="sm"
                          variant={character.isOffCamera ? "default" : "ghost"}
                          onClick={() => toggleOffCamera(character.id)}
                          className="h-8 px-2"
                        >
                          Off-cam
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeCharacter(character.id)}
                          className="h-8 px-2 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
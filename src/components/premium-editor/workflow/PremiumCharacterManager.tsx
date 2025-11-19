import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePremiumCharacters } from '@/hooks/premium-editor/usePremiumCharacters';
import { PremiumCharacter } from '@/types/premium-transcript';
import { CWI_ALL_COLORS } from '@/lib/premium/cwiPalette';
import { Plus, Trash2, Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumCharacterManagerProps {
  videoId: string;
  onCharactersChange?: () => void;
}

export function PremiumCharacterManager({
  videoId,
  onCharactersChange
}: PremiumCharacterManagerProps) {
  const {
    characters,
    loading,
    saving,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    detectSpeakers
  } = usePremiumCharacters({ videoId, onCharactersChange });

  const [showAddForm, setShowAddForm] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState('');
  const [newCharacterType, setNewCharacterType] = useState<'main' | 'supporting' | 'minor' | 'off_camera'>('main');

  const handleAddCharacter = async () => {
    if (!newCharacterName.trim()) return;

    try {
      await createCharacter(newCharacterName, newCharacterType);
      setNewCharacterName('');
      setNewCharacterType('main');
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add character:', error);
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
          <span>Characters</span>
          <Badge variant="secondary">{characters.length}</Badge>
        </CardTitle>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => detectSpeakers()}
            disabled={saving}
            className="flex-1 gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Users className="w-4 h-4" />
            )}
            Detect Speakers
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddForm(!showAddForm)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>

        {showAddForm && (
          <div className="space-y-3 p-3 bg-muted rounded-lg">
            <div className="space-y-2">
              <Label>Character Name</Label>
              <Input
                value={newCharacterName}
                onChange={(e) => setNewCharacterName(e.target.value)}
                placeholder="e.g., John Doe"
                onKeyPress={(e) => e.key === 'Enter' && handleAddCharacter()}
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newCharacterType} onValueChange={(v: any) => setNewCharacterType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">Main Character</SelectItem>
                  <SelectItem value="supporting">Supporting</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="off_camera">Off Camera</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleAddCharacter}
                className="flex-1"
              >
                Create Character
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewCharacterName('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <ScrollArea className="flex-1">
        <CardContent className="space-y-2 pt-0">
          {characters.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-2">No characters yet</p>
              <p className="text-sm text-muted-foreground">Detect speakers or add manually</p>
            </div>
          ) : (
            characters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                onUpdate={(updates) => updateCharacter(character.id, updates)}
                onDelete={() => deleteCharacter(character.id)}
              />
            ))
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}

interface CharacterCardProps {
  character: PremiumCharacter;
  onUpdate: (updates: Partial<PremiumCharacter>) => void;
  onDelete: () => void;
}

function CharacterCard({ character, onUpdate, onDelete }: CharacterCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(character.name);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleSave = () => {
    onUpdate({ name: editName });
    setIsEditing(false);
  };

  return (
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-8 h-8 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
              style={{ backgroundColor: character.color }}
              title="Change color"
            />

            {showColorPicker && (
              <div className="absolute left-0 top-full mt-2 p-2 bg-popover rounded-lg shadow-lg border z-20">
                <div className="grid grid-cols-6 gap-1 w-48">
                  {CWI_ALL_COLORS.map((color) => (
                    <button
                      key={color.hex}
                      onClick={() => {
                        onUpdate({ color: color.hex });
                        setShowColorPicker(false);
                      }}
                      className={cn(
                        'w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform',
                        character.color === color.hex ? 'border-foreground' : 'border-transparent'
                      )}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSave}
                onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                className="h-8 text-sm"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="font-medium text-foreground hover:text-primary transition-colors truncate block w-full text-left"
              >
                {character.name}
              </button>
            )}
          </div>
        </div>

        <button
          onClick={onDelete}
          className="p-1 hover:bg-destructive/10 rounded text-destructive"
          title="Delete character"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <Select value={character.type} onValueChange={(v: any) => onUpdate({ type: v })}>
        <SelectTrigger className="text-xs h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="main">Main</SelectItem>
          <SelectItem value="supporting">Supporting</SelectItem>
          <SelectItem value="minor">Minor</SelectItem>
          <SelectItem value="off_camera">Off Camera</SelectItem>
        </SelectContent>
      </Select>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <Label className="text-xs mb-1 block">Emphasis</Label>
          <Select value={character.emphasis} onValueChange={(v) => onUpdate({ emphasis: v })}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="loud">Loud</SelectItem>
              <SelectItem value="quiet">Quiet</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs mb-1 block">Pitch</Label>
          <Select value={character.pitch} onValueChange={(v) => onUpdate({ pitch: v })}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Palette, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CWI_PALETTE, getNextAvailableColor } from '@/lib/cwiPalette';

interface Character {
  id: string;
  name: string;
  color: string;
  type: string;
  importance: 'primary' | 'secondary' | 'supporting' | 'background';
  segmentCount: number;
}

interface CharacterColorManagerProps {
  videoId: string;
  onColorsUpdated?: (colors: { [name: string]: string }) => void;
}

// Full 42-color CWI palette for display
const DISPLAY_PALETTE = {
  main: CWI_PALETTE.main,
  supporting: CWI_PALETTE.supporting,
  pastel: CWI_PALETTE.minor
};

export function CharacterColorManager({ videoId, onColorsUpdated }: CharacterColorManagerProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCharacters();
  }, [videoId]);

  const loadCharacters = async () => {
    setIsLoading(true);
    try {
      // Load characters from database
      const { data: charactersData, error: charsError } = await supabase
        .from('characters')
        .select('*')
        .eq('video_id', videoId);

      if (charsError) throw charsError;

      // Count appearances in transcript segments
      const { data: segments, error: segsError } = await supabase
        .from('transcript_segments')
        .select('speaker')
        .eq('video_id', videoId);

      if (segsError) throw segsError;

      // Count speaker appearances
      const speakerCounts = (segments || []).reduce((acc, seg) => {
        if (seg.speaker) {
          acc[seg.speaker] = (acc[seg.speaker] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const chars: Character[] = (charactersData || []).map(c => {
        const segmentCount = speakerCounts[c.name] || 0;
        return {
          id: c.id,
          name: c.name,
          color: c.color,
          type: c.type,
          importance: determineImportance(segmentCount),
          segmentCount
        };
      });

      // Sort by segment count
      chars.sort((a, b) => b.segmentCount - a.segmentCount);

      setCharacters(chars);
      
      // Notify parent of colors
      const colorMap = chars.reduce((acc, char) => {
        acc[char.name] = char.color;
        return acc;
      }, {} as { [name: string]: string });
      
      onColorsUpdated?.(colorMap);

    } catch (error) {
      console.error('Failed to load characters:', error);
      toast.error('Failed to load characters');
    } finally {
      setIsLoading(false);
    }
  };

  const determineImportance = (segmentCount: number): Character['importance'] => {
    if (segmentCount >= 20) return 'primary';
    if (segmentCount >= 10) return 'secondary';
    if (segmentCount >= 5) return 'supporting';
    return 'background';
  };

  const updateCharacterColor = async (characterId: string, newColor: string) => {
    try {
      const { error } = await supabase
        .from('characters')
        .update({ color: newColor })
        .eq('id', characterId);

      if (error) throw error;

      setCharacters(prev => prev.map(char =>
        char.id === characterId ? { ...char, color: newColor } : char
      ));

      toast.success('Character color updated');
      
      // Update parent
      const colorMap = characters.reduce((acc, char) => {
        acc[char.name] = char.id === characterId ? newColor : char.color;
        return acc;
      }, {} as { [name: string]: string });
      
      onColorsUpdated?.(colorMap);

    } catch (error) {
      console.error('Failed to update color:', error);
      toast.error('Failed to update color');
    }
  };

  const autoAssignColors = async () => {
    try {
      const sorted = [...characters].sort((a, b) => b.segmentCount - a.segmentCount);
      
      const updates = sorted.map((char, index) => {
        let color: string;
        
        if (index < 6) {
          color = DISPLAY_PALETTE.main[index];
        } else if (index < 18) {
          color = DISPLAY_PALETTE.supporting[index - 6];
        } else {
          color = DISPLAY_PALETTE.pastel[Math.min(index - 18, DISPLAY_PALETTE.pastel.length - 1)];
        }

        return { id: char.id, color };
      });

      for (const update of updates) {
        await supabase
          .from('characters')
          .update({ color: update.color })
          .eq('id', update.id);
      }

      await loadCharacters();
      toast.success('Colors auto-assigned based on CWI system');

    } catch (error) {
      console.error('Failed to auto-assign colors:', error);
      toast.error('Failed to auto-assign colors');
    }
  };

  const exportColorScheme = () => {
    const scheme = characters.map(char => ({
      name: char.name,
      color: char.color,
      importance: char.importance,
      segments: char.segmentCount
    }));

    const blob = new Blob([JSON.stringify(scheme, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${videoId}-cwi-colors.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Color scheme exported');
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            CWI Character Colors
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={autoAssignColors}>
              Auto-Assign
            </Button>
            <Button size="sm" variant="outline" onClick={exportColorScheme}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading characters...</div>
          ) : characters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No characters detected yet
            </div>
          ) : (
            <div className="space-y-3">
              {characters.map((character) => (
                <div
                  key={character.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="w-10 h-10 rounded border-2 border-border hover:scale-110 transition-transform"
                          style={{ backgroundColor: character.color }}
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-4">
                          <h4 className="font-semibold">Choose Color</h4>
                          
                          {/* Main Colors */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Main Colors (6)</p>
                            <div className="grid grid-cols-6 gap-2">
                              {DISPLAY_PALETTE.main.map((color, idx) => (
                                <button
                                  key={`main-${idx}`}
                                  onClick={() => updateCharacterColor(character.id, color)}
                                  className="w-8 h-8 rounded border hover:scale-110 transition-transform"
                                  style={{ backgroundColor: color }}
                                  title={`Main ${idx + 1}`}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Supporting Colors */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Supporting Colors (12)</p>
                            <div className="grid grid-cols-6 gap-2">
                              {DISPLAY_PALETTE.supporting.map((color, idx) => (
                                <button
                                  key={`support-${idx}`}
                                  onClick={() => updateCharacterColor(character.id, color)}
                                  className="w-8 h-8 rounded border hover:scale-110 transition-transform"
                                  style={{ backgroundColor: color }}
                                  title={`Supporting ${idx + 1}`}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Pastel Colors */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Pastel Colors (24)</p>
                            <div className="grid grid-cols-8 gap-1.5">
                              {DISPLAY_PALETTE.pastel.map((color, idx) => (
                                <button
                                  key={`pastel-${idx}`}
                                  onClick={() => updateCharacterColor(character.id, color)}
                                  className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                                  style={{ backgroundColor: color }}
                                  title={`Pastel ${idx + 1}`}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Custom Color */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Custom</p>
                            <input
                              type="color"
                              value={character.color}
                              onChange={(e) => updateCharacterColor(character.id, e.target.value)}
                              className="w-full h-10 rounded border cursor-pointer"
                            />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{character.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {character.importance}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {character.segmentCount} segments
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

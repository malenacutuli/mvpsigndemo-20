import { CharacterManager } from '@/components/CharacterManager';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';

interface PremiumCharacterManagerProps {
  videoId: string;
  language: string;
  characters: any[];
  onCharactersUpdate: (characters: any[]) => void;
}

export function PremiumCharacterManager({
  videoId,
  language,
  onCharactersUpdate
}: PremiumCharacterManagerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5" />
          Character Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CharacterManager
          videoId={videoId}
          language={language}
          onCharactersUpdate={onCharactersUpdate}
        />
      </CardContent>
    </Card>
  );
}

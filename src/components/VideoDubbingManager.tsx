import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Wand2 } from 'lucide-react';

interface VideoDubbingManagerProps {
  videoUrl?: string;
  originalLanguage?: string;
}

export const VideoDubbingManager: React.FC<VideoDubbingManagerProps> = ({
  videoUrl,
  originalLanguage
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generateDubbing = async () => {
    if (!selectedLanguage) return;
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 3000);
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Globe className="w-5 h-5" />
        AI Dubbing & Translations
      </h3>
      <div className="space-y-4">
        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
          <SelectTrigger>
            <SelectValue placeholder="Select language..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="es">🇪🇸 Spanish</SelectItem>
            <SelectItem value="fr">🇫🇷 French</SelectItem>
            <SelectItem value="de">🇩🇪 German</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={generateDubbing} disabled={isGenerating || !selectedLanguage}>
          <Wand2 className="w-4 h-4 mr-2" />
          {isGenerating ? 'Generating...' : 'Generate Dubbing'}
        </Button>
      </div>
    </Card>
  );
};
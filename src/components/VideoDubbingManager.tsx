import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Wand2, Download, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VideoDubbingManagerProps {
  videoId?: string;
  videoUrl?: string;
  originalLanguage?: string;
  transcriptText?: string;
  audioDescriptions?: Array<{
    text: string;
    startTime: number;
    endTime: number;
    voiceStyle?: string;
  }>;
}

export const VideoDubbingManager: React.FC<VideoDubbingManagerProps> = ({
  videoId,
  videoUrl,
  originalLanguage,
  transcriptText,
  audioDescriptions
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [dubbingResult, setDubbingResult] = useState<any>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const generateDubbing = async () => {
    const sourceText = getSourceText();
    if (!selectedLanguage || !sourceText) {
      toast.error('Please select a language and ensure content is available for dubbing');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-dubbing', {
        body: {
          text: sourceText,
          targetLanguage: selectedLanguage,
          voiceId: getVoiceForLanguage(selectedLanguage)
        }
      });

      if (error) throw error;

      setDubbingResult(data);
      
      // Create audio URL from base64
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))],
        { type: 'audio/mpeg' }
      );
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      toast.success(`Dubbing generated in ${getLanguageDisplay(selectedLanguage)}!`);
    } catch (error: any) {
      console.error('Dubbing error:', error);
      toast.error(error.message || 'Failed to generate dubbing');
    } finally {
      setIsGenerating(false);
    }
  };

  const getSourceText = () => {
    if (transcriptText) {
      return transcriptText;
    }
    
    if (audioDescriptions && audioDescriptions.length > 0) {
      // Combine all audio descriptions into a single text
      return audioDescriptions.map(ad => ad.text).join(' ');
    }
    
    return null;
  };

  const getVoiceForLanguage = (lang: string) => {
    const voices: Record<string, string> = {
      'es': 'EXAVITQu4vr4xnSDxMaL', // Sarah
      'fr': 'FGY2WhTYpPnrIDTdsKH5', // Laura  
      'de': 'CwhRBWXzGAHq8TQ4Fs17', // Roger
    };
    return voices[lang] || 'EXAVITQu4vr4xnSDxMaL';
  };

  const getLanguageDisplay = (lang: string) => {
    const display: Record<string, string> = {
      'es': 'Spanish',
      'fr': 'French', 
      'de': 'German'
    };
    return display[lang] || lang;
  };

  const playDubbing = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  const downloadDubbing = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `dubbing-${selectedLanguage}.mp3`;
      a.click();
    }
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
        <Button onClick={generateDubbing} disabled={isGenerating || !selectedLanguage || !getSourceText()}>
          <Wand2 className="w-4 h-4 mr-2" />
          {isGenerating ? 'Generating...' : 'Generate Dubbing'}
        </Button>

        {dubbingResult && (
          <div className="space-y-3 mt-4 p-3 bg-muted rounded-lg">
            <div>
              <h4 className="font-medium text-sm">Translated Text:</h4>
              <p className="text-sm text-muted-foreground mt-1">{dubbingResult.translatedText}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={playDubbing} variant="outline" size="sm">
                <Play className="w-3 h-3 mr-1" />
                Play
              </Button>
              <Button onClick={downloadDubbing} variant="outline" size="sm">
                <Download className="w-3 h-3 mr-1" />
                Download
              </Button>
            </div>
          </div>
        )}

        {!getSourceText() && (
          <p className="text-sm text-muted-foreground">
            Generate a transcript or audio descriptions to enable dubbing
          </p>
        )}

        {transcriptText && (
          <div className="text-xs text-muted-foreground">
            Source: Video Transcript
          </div>
        )}

        {!transcriptText && audioDescriptions && audioDescriptions.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Source: Audio Descriptions ({audioDescriptions.length} segments)
          </div>
        )}
      </div>
    </Card>
  );
};
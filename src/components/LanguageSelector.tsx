import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CaptionSegment } from './CaptionsWithIntention';

interface LanguageOption {
  code: string;
  name: string;
}

interface TranslatedContent {
  language: string;
  captions: CaptionSegment[];
  audioDescription: Array<{ text: string; startTime: number; endTime: number; voiceStyle: 'passionate' | 'warm' | 'authoritative' | 'encouraging' }>;
  dubbingAudio?: string;
}

interface LanguageSelectorProps {
  currentLanguage: string;
  originalLanguage: string; // The video's original language
  originalCaptions?: CaptionSegment[];
  originalAudioDescription?: Array<{ text: string; startTime: number; endTime: number; voiceStyle: 'passionate' | 'warm' | 'authoritative' | 'encouraging' }>;
  onLanguageChange: (language: string, translatedContent?: TranslatedContent) => void;
  onTranslatedContentUpdate: (content: TranslatedContent) => void;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  originalLanguage,
  originalCaptions,
  originalAudioDescription,
  onLanguageChange,
  onTranslatedContentUpdate,
}) => {
  const [translatedContent, setTranslatedContent] = useState<TranslatedContent[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);

  const translateContent = async (targetLanguage: string) => {
    if (!originalCaptions?.length && !originalAudioDescription?.length) {
      toast.error('No content available to translate');
      return;
    }

    setIsTranslating(true);
    try {
      // Translate captions if available
      let translatedCaptions: CaptionSegment[] = [];
      if (originalCaptions?.length) {
        // Translate in batches to preserve segment count
        const batchSize = 10;
        const captionBatches: CaptionSegment[][] = [];
        
        for (let i = 0; i < originalCaptions.length; i += batchSize) {
          captionBatches.push(originalCaptions.slice(i, i + batchSize));
        }

        for (const batch of captionBatches) {
          const captionTexts = batch.map(cap => cap.text);
          const { data: captionData, error: captionError } = await supabase.functions.invoke('generate-dubbing', {
            body: {
              text: captionTexts.join('\n---\n'), // Use clear separator
              targetLanguage,
              translateOnly: true
            }
          });

          if (captionError) throw captionError;

          const translatedTexts = captionData.translatedText
            .split('\n---\n')
            .map((t: string) => t.trim())
            .filter((t: string) => t.length > 0);

          const batchTranslated = batch.map((caption, index) => ({
            ...caption,
            text: translatedTexts[index] || caption.text,
            words: caption.words?.map(word => ({
              ...word,
              text: translatedTexts[index] || word.text
            })) || []
          }));

          translatedCaptions.push(...batchTranslated);
        }
      }

      // Translate audio description if available
      let translatedAD: Array<{ text: string; startTime: number; endTime: number; voiceStyle: 'passionate' | 'warm' | 'authoritative' | 'encouraging' }> = [];
      if (originalAudioDescription?.length) {
        const adTexts = originalAudioDescription.map(ad => ad.text);
        const { data: adData, error: adError } = await supabase.functions.invoke('generate-dubbing', {
          body: {
            text: adTexts.join('\n---\n'), // Use clear separator
            targetLanguage,
            translateOnly: true
          }
        });

        if (adError) throw adError;

        const translatedADTexts = adData.translatedText
          .split('\n---\n')
          .map((t: string) => t.trim())
          .filter((t: string) => t.length > 0);
          
        translatedAD = originalAudioDescription.map((ad, index) => ({
          ...ad,
          text: translatedADTexts[index] || ad.text
        }));
      }

      const newTranslatedContent: TranslatedContent = {
        language: targetLanguage,
        captions: translatedCaptions,
        audioDescription: translatedAD,
      };

      setTranslatedContent(prev => [
        ...prev.filter(t => t.language !== targetLanguage),
        newTranslatedContent
      ]);

      onTranslatedContentUpdate(newTranslatedContent);
      toast.success(`Content translated to ${getLanguageName(targetLanguage)}!`);
    } catch (error: any) {
      console.error('Translation error:', error);
      toast.error(error.message || 'Failed to translate content');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleLanguageChange = async (language: string) => {
    // If switching back to the original language, return to original content
    if (language === originalLanguage) {
      setTranslatedContent([]); // Clear translations when returning to original
      onLanguageChange(language); // Notify parent to use original content
      return;
    }

    // Check if we have translation for this language
    const existing = translatedContent.find(t => t.language === language);
    
    if (!existing) {
      // Generate translation if it doesn't exist
      await translateContent(language);
      // The onTranslatedContentUpdate is called inside translateContent after success
    } else {
      // Use existing translation immediately
      onLanguageChange(language);
      onTranslatedContentUpdate(existing);
    }
  };

  const getLanguageName = (code: string) => {
    return LANGUAGES.find(l => l.code === code)?.name || code;
  };

  const needsTranslation = currentLanguage !== originalLanguage && !translatedContent.find(t => t.language === currentLanguage);

  return (
    <div className="flex items-center gap-2">
      <Select value={currentLanguage} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-40 bg-black/50 border-white/20 text-white">
          <SelectValue>
            <div className="flex items-center gap-2">
              <Globe className="w-3 h-3" />
              {getLanguageName(currentLanguage)}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-background border-border z-50">
          {LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <div className="flex items-center gap-2">
                {lang.name}
                {isTranslating && currentLanguage === lang.code && (
                  <Loader2 className="w-3 h-3 animate-spin ml-2" />
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {needsTranslation && !isTranslating && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => translateContent(currentLanguage)}
          className="text-white hover:bg-white/20 text-xs"
          disabled={isTranslating}
        >
          Translate
        </Button>
      )}
    </div>
  );
};
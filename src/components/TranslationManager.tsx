import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Languages, Download, Save, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CaptionSegment } from './CaptionsWithIntention';

interface AudioDescriptionSegment {
  id?: string;
  text: string;
  startTime: number;
  endTime: number;
  voiceStyle: string;
  timestamp?: number;
}

interface TranslationManagerProps {
  videoId: string;
  originalLanguage: string;
  originalCaptions: CaptionSegment[];
  originalAudioDescriptions: AudioDescriptionSegment[];
  onTranslationsUpdate?: (translations: Record<string, { captions: CaptionSegment[]; audioDescriptions: AudioDescriptionSegment[] }>) => void;
}

const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' }
];

// ElevenLabs native voices for each language
const getLanguageVoice = (language: string): string => {
  const languageVoices = {
    'es': 'VR6AewLTigWG4xSOukaG', // Pablo - Spanish  
    'fr': 'ThT5KcBeYPX3keUQqHPh', // Alain - French
    'de': 'TxGEqnHWrfWFTfGW9XjX', // Klaus - German
    'it': 'XrExE9yKIg1WjnnlVkGX', // Matilda - Italian
    'pt': 'TxGEqnHWrfWFTfGW9XjX', // Portuguese variant
    'nl': 'bVMeCyTHy58xNoL34h3p', // Dutch
    'pl': 'EXAVITQu4vr4xnSDxMaL', // Polish (fallback to English)
    'zh': 'onwK4e9ZLuTAKqWW03F9', // Chinese
    'ja': 'pNInz6obpgDQGcFmaJgB', // Japanese
    'ko': 'pFZP5JQG7iQjIQuC4Bku', // Korean
    'ru': 'EXAVITQu4vr4xnSDxMaL', // Russian (fallback to English)
    'ar': 'EXAVITQu4vr4xnSDxMaL', // Arabic (fallback to English)
    'hi': 'EXAVITQu4vr4xnSDxMaL', // Hindi (fallback to English)
  };
  return languageVoices[language] || 'EXAVITQu4vr4xnSDxMaL';
};

export const TranslationManager: React.FC<TranslationManagerProps> = ({
  videoId,
  originalLanguage,
  originalCaptions,
  originalAudioDescriptions,
  onTranslationsUpdate
}) => {
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [translations, setTranslations] = useState<Record<string, { captions: CaptionSegment[]; audioDescriptions: AudioDescriptionSegment[] }>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [currentTranslatingLang, setCurrentTranslatingLang] = useState<string>('');
  const { toast } = useToast();

  // Load existing translations
  useEffect(() => {
    loadExistingTranslations();
  }, [videoId]);

  // Filter out the original language from available options
  const availableLanguages = SUPPORTED_LANGUAGES.filter(lang => lang.code !== originalLanguage);

  const loadExistingTranslations = async () => {
    try {
      // Load translations for captions
      const { data: captionTranslations } = await supabase
        .from('transcript_segments')
        .select('*')
        .eq('video_id', videoId)
        .neq('language', originalLanguage);

        // Load translations for audio descriptions - use correct table structure
        const { data: adTranslations } = await supabase
          .from('audio_descriptions') 
          .select('*')
          .eq('video_id', videoId)
          .neq('language', originalLanguage);

      // Group by language
      const loadedTranslations: Record<string, { captions: CaptionSegment[]; audioDescriptions: AudioDescriptionSegment[] }> = {};

      // Process caption translations
      if (captionTranslations) {
        const captionsByLang = captionTranslations.reduce((acc, segment) => {
          const lang = segment.language;
          if (!acc[lang]) acc[lang] = [];
          acc[lang].push({
            text: segment.text,
            speaker: segment.speaker || 'Speaker',
            startTime: segment.start_time,
            endTime: segment.end_time,
            words: [], // Will be regenerated if needed
            volume: 50,
            pitch: 160,
            type: 'dialogue' as const,
            isOffCamera: false,
            speakerColor: segment.speaker_color
          });
          return acc;
        }, {} as Record<string, CaptionSegment[]>);

        Object.keys(captionsByLang).forEach(lang => {
          if (!loadedTranslations[lang]) {
            loadedTranslations[lang] = { captions: [], audioDescriptions: [] };
          }
          loadedTranslations[lang].captions = captionsByLang[lang].sort((a, b) => a.startTime - b.startTime);
        });
      }

      // Process audio description translations
      if (adTranslations) {
        const adsByLang = adTranslations.reduce((acc, ad) => {
          const lang = ad.language;
          if (!acc[lang]) acc[lang] = [];
          acc[lang].push({
            id: ad.id,
            text: ad.description,
            startTime: ad.start_time,
            endTime: ad.end_time,
            voiceStyle: getLanguageVoice(lang), // Use voice based on language
            timestamp: ad.start_time // Use start_time as timestamp fallback
          });
          return acc;
        }, {} as Record<string, AudioDescriptionSegment[]>);

        Object.keys(adsByLang).forEach(lang => {
          if (!loadedTranslations[lang]) {
            loadedTranslations[lang] = { captions: [], audioDescriptions: [] };
          }
          loadedTranslations[lang].audioDescriptions = adsByLang[lang].sort((a, b) => a.startTime - b.startTime);
        });
      }

      if (Object.keys(loadedTranslations).length > 0) {
        setTranslations(loadedTranslations);
        setSelectedLanguages(Object.keys(loadedTranslations));
        console.log('✅ Loaded existing translations for languages:', Object.keys(loadedTranslations));
      }
    } catch (error) {
      console.error('❌ Error loading existing translations:', error);
    }
  };

  const translateContent = async (text: string, targetLanguage: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('generate-dubbing', {
      body: {
        text,
        targetLanguage,
        translateOnly: true // Add this flag to only translate without TTS
      }
    });

    if (error) {
      throw new Error(`Translation failed: ${error.message}`);
    }

    return data?.translatedText || text;
  };

  const generateTranslations = async () => {
    if (selectedLanguages.length === 0) {
      toast({
        title: "No languages selected",
        description: "Please select at least one language to translate to.",
        variant: "destructive",
      });
      return;
    }

    if (originalCaptions.length === 0 && originalAudioDescriptions.length === 0) {
      toast({
        title: "No content to translate",
        description: "Please extract transcript and generate audio descriptions first.",
        variant: "destructive",
      });
      return;
    }

    setIsTranslating(true);
    setTranslationProgress(0);

    try {
      const newTranslations = { ...translations };
      const totalSteps = selectedLanguages.length * 2; // Captions + Audio Descriptions for each language
      let currentStep = 0;

      for (const targetLang of selectedLanguages) {
        // Skip if already translated
        if (newTranslations[targetLang]) {
          currentStep += 2;
          setTranslationProgress((currentStep / totalSteps) * 100);
          continue;
        }

        setCurrentTranslatingLang(SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name || targetLang);
        
        // Initialize translation object
        newTranslations[targetLang] = {
          captions: [],
          audioDescriptions: []
        };

        // Translate captions
        if (originalCaptions.length > 0) {
          console.log(`🔄 Translating ${originalCaptions.length} captions to ${targetLang}`);
          const translatedCaptions: CaptionSegment[] = [];

          for (const caption of originalCaptions) {
            try {
              const translatedText = await translateContent(caption.text, targetLang);
              translatedCaptions.push({
                ...caption,
                text: translatedText,
                words: [], // Will be regenerated when needed
              });
            } catch (error) {
              console.error(`❌ Failed to translate caption: ${caption.text}`, error);
              // Keep original text as fallback
              translatedCaptions.push(caption);
            }
          }

          newTranslations[targetLang].captions = translatedCaptions;
        }

        currentStep++;
        setTranslationProgress((currentStep / totalSteps) * 100);

        // Translate audio descriptions
        if (originalAudioDescriptions.length > 0) {
          console.log(`🔄 Translating ${originalAudioDescriptions.length} audio descriptions to ${targetLang}`);
          const translatedADs: AudioDescriptionSegment[] = [];

          for (const ad of originalAudioDescriptions) {
            try {
              const translatedText = await translateContent(ad.text, targetLang);
              translatedADs.push({
                ...ad,
                text: translatedText,
                voiceStyle: getLanguageVoice(targetLang), // Use native voice for target language
              });
            } catch (error) {
              console.error(`❌ Failed to translate audio description: ${ad.text}`, error);
              // Keep original with target language voice
              translatedADs.push({
                ...ad,
                voiceStyle: getLanguageVoice(targetLang)
              });
            }
          }

          newTranslations[targetLang].audioDescriptions = translatedADs;
        }

        currentStep++;
        setTranslationProgress((currentStep / totalSteps) * 100);
      }

      setTranslations(newTranslations);
      
      // Save translations to database
      await saveTranslations(newTranslations);

      if (onTranslationsUpdate) {
        onTranslationsUpdate(newTranslations);
      }

      toast({
        title: "Translations Generated",
        description: `Successfully translated content to ${selectedLanguages.length} languages.`,
      });

    } catch (error) {
      console.error('❌ Translation error:', error);
      toast({
        title: "Translation Failed",
        description: error instanceof Error ? error.message : "An error occurred during translation.",
        variant: "destructive",
      });
    } finally {
      setIsTranslating(false);
      setTranslationProgress(0);
      setCurrentTranslatingLang('');
    }
  };

  const saveTranslations = async (translationsToSave: Record<string, { captions: CaptionSegment[]; audioDescriptions: AudioDescriptionSegment[] }>) => {
    setIsSaving(true);
    try {
      for (const [lang, content] of Object.entries(translationsToSave)) {
        // Save caption translations
        if (content.captions.length > 0) {
          const captionInserts = content.captions.map((caption, index) => ({
            video_id: videoId,
            text: caption.text,
            start_time: caption.startTime,
            end_time: caption.endTime,
            speaker: caption.speaker,
            speaker_color: caption.speakerColor,
            language: lang,
            emphasis: caption.words?.[0]?.emphasis || 'normal',
            pitch: caption.words?.[0]?.pitch || 'normal'
          }));

          const { error: captionError } = await supabase
            .from('transcript_segments')
            .upsert(captionInserts, {
              onConflict: 'video_id,start_time,language'
            });

          if (captionError) {
            console.error(`❌ Error saving captions for ${lang}:`, captionError);
          } else {
            console.log(`✅ Saved ${captionInserts.length} caption translations for ${lang}`);
          }
        }

        // Save audio description translations
        if (content.audioDescriptions.length > 0) {
          const adInserts = content.audioDescriptions.map(ad => ({
            video_id: videoId,
            description: ad.text,
            start_time: ad.startTime,
            end_time: ad.endTime,
            language: lang,
            description_type: 'translation' // Mark as translation
          }));

          const { error: adError } = await supabase
            .from('audio_descriptions')
            .upsert(adInserts, {
              onConflict: 'video_id,start_time,language'
            });

          if (adError) {
            console.error(`❌ Error saving audio descriptions for ${lang}:`, adError);
          } else {
            console.log(`✅ Saved ${adInserts.length} audio description translations for ${lang}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error saving translations:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save translations to database.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLanguageSelection = (languageCode: string) => {
    if (selectedLanguages.includes(languageCode)) {
      setSelectedLanguages(selectedLanguages.filter(lang => lang !== languageCode));
    } else {
      setSelectedLanguages([...selectedLanguages, languageCode]);
    }
  };

  const exportTranslation = (language: string, type: 'captions' | 'audioDescriptions') => {
    const content = translations[language];
    if (!content) return;

    const data = type === 'captions' ? content.captions : content.audioDescriptions;
    const langName = SUPPORTED_LANGUAGES.find(l => l.code === language)?.name || language;
    
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${videoId}-${type}-${language}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: `${langName} ${type} exported successfully.`,
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="w-5 h-5" />
          Translation Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Language Selection */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Select Target Languages</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {availableLanguages.map((lang) => (
              <Button
                key={lang.code}
                variant={selectedLanguages.includes(lang.code) ? "default" : "outline"}
                size="sm"
                onClick={() => handleLanguageSelection(lang.code)}
                className="justify-start text-xs"
              >
                {lang.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Generate Translations */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={generateTranslations}
            disabled={isTranslating || selectedLanguages.length === 0 || (originalCaptions.length === 0 && originalAudioDescriptions.length === 0)}
            className="flex-1"
          >
            {isTranslating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Translating {currentTranslatingLang}...
              </>
            ) : (
              <>
                <Languages className="w-4 h-4 mr-2" />
                Generate Translations
              </>
            )}
          </Button>
          
          {isSaving && (
            <Button disabled variant="outline">
              <Save className="w-4 h-4 mr-2" />
              Saving...
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        {isTranslating && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Translation Progress</span>
              <span>{Math.round(translationProgress)}%</span>
            </div>
            <Progress value={translationProgress} className="w-full" />
          </div>
        )}

        {/* Translation Results */}
        {Object.keys(translations).length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Generated Translations</h3>
            <Tabs defaultValue={Object.keys(translations)[0]} className="w-full">
              <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
                {Object.keys(translations).map((lang) => {
                  const langData = SUPPORTED_LANGUAGES.find(l => l.code === lang);
                  return (
                    <TabsTrigger key={lang} value={lang} className="text-xs">
                      {langData?.name || lang}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              
              {Object.entries(translations).map(([lang, content]) => {
                const langData = SUPPORTED_LANGUAGES.find(l => l.code === lang);
                return (
                  <TabsContent key={lang} value={lang} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Captions */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center justify-between">
                            Captions ({content.captions.length})
                            <div className="flex gap-2">
                              <Badge variant="secondary">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {langData?.nativeName}
                              </Badge>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => exportTranslation(lang, 'captions')}
                                className="h-6 px-2"
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {content.captions.slice(0, 3).map((caption, index) => (
                              <div key={index} className="text-xs p-2 bg-muted rounded">
                                <div className="font-medium">{caption.speaker}</div>
                                <div>{caption.text.substring(0, 60)}...</div>
                              </div>
                            ))}
                            {content.captions.length > 3 && (
                              <div className="text-xs text-muted-foreground text-center">
                                +{content.captions.length - 3} more captions
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Audio Descriptions */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center justify-between">
                            Audio Descriptions ({content.audioDescriptions.length})
                            <div className="flex gap-2">
                              <Badge variant="secondary">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {langData?.nativeName}
                              </Badge>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => exportTranslation(lang, 'audioDescriptions')}
                                className="h-6 px-2"
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {content.audioDescriptions.slice(0, 3).map((ad, index) => (
                              <div key={index} className="text-xs p-2 bg-muted rounded">
                                <div className="text-muted-foreground">
                                  {Math.floor(ad.startTime / 60)}:{(ad.startTime % 60).toFixed(0).padStart(2, '0')}
                                </div>
                                <div>{ad.text.substring(0, 60)}...</div>
                              </div>
                            ))}
                            {content.audioDescriptions.length > 3 && (
                              <div className="text-xs text-muted-foreground text-center">
                                +{content.audioDescriptions.length - 3} more descriptions
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

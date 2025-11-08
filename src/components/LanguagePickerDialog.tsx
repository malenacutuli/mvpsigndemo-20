import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface LanguagePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (language: string) => void;
  availableLanguages: string[];
  currentLanguages: string[];
}

const supportedLanguages = [
  { code: 'en', name: '🇬🇧 English' },
  { code: 'es', name: '🇪🇸 Español' },
  { code: 'fr', name: '🇫🇷 Français' },
  { code: 'de', name: '🇩🇪 Deutsch' },
  { code: 'it', name: '🇮🇹 Italiano' },
  { code: 'pt', name: '🇵🇹 Português' },
  { code: 'ja', name: '🇯🇵 日本語' },
  { code: 'ko', name: '🇰🇷 한국어' },
  { code: 'zh', name: '🇨🇳 中文' },
  { code: 'ar', name: '🇸🇦 العربية' },
  { code: 'ru', name: '🇷🇺 Русский' }
];

export const LanguagePickerDialog: React.FC<LanguagePickerDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  availableLanguages,
  currentLanguages
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');

  // Filter out languages that already have descriptions
  const newLanguages = supportedLanguages.filter(
    lang => !currentLanguages.includes(lang.code)
  );

  const handleConfirm = () => {
    if (selectedLanguage) {
      onConfirm(selectedLanguage);
      setSelectedLanguage('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Translate to New Language</DialogTitle>
          <DialogDescription>
            Select a language to translate your audio descriptions to.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Target Language</Label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Select a language..." />
              </SelectTrigger>
              <SelectContent>
                {newLanguages.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {newLanguages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              All supported languages already have translations.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!selectedLanguage || newLanguages.length === 0}
          >
            Translate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

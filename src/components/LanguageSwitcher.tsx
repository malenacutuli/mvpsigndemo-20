import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe } from 'lucide-react';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  shortCode: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', shortCode: 'EN' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', shortCode: 'ESP' },
  { code: 'fr', name: 'French', nativeName: 'Français', shortCode: 'FR' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', shortCode: 'IT' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', shortCode: 'DE' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', shortCode: 'POR' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català', shortCode: 'CAT' },
];

export const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <div className="flex items-center">
      <Select value={i18n.language} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-auto min-w-[80px] border-none bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0">
          <SelectValue>
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span className="text-sm font-medium">{currentLanguage.shortCode}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="end" className="min-w-[180px]">
          {languages.map((language) => (
            <SelectItem key={language.code} value={language.code}>
              <div className="flex items-center justify-between w-full">
                <span>{language.nativeName}</span>
                <span className="text-xs text-muted-foreground ml-2 font-medium">
                  {language.shortCode}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
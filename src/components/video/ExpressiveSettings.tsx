import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export interface ExpressiveSettings {
  enabled: boolean;
  
  // EC Protocol
  useStyles: boolean;
  lengthenWords: boolean;
  showSoundLabels: boolean;
  showEnvironmentalSounds: boolean;
  
  // Advanced
  dynamicSizing: boolean;
  showSentimentBadge: boolean;
  highlightPitch: boolean;
  
  // Intensity thresholds
  whisperThreshold: number;
  yellThreshold: number;
  
  // Accessibility
  reduceMotion: boolean;
  highContrast: boolean;
  minFontSize: number;
}

export const DEFAULT_SETTINGS: ExpressiveSettings = {
  enabled: true,
  useStyles: true,
  lengthenWords: false,
  showSoundLabels: true,
  showEnvironmentalSounds: true,
  dynamicSizing: true,
  showSentimentBadge: false,
  highlightPitch: false,
  whisperThreshold: -25,
  yellThreshold: -10,
  reduceMotion: false,
  highContrast: false,
  minFontSize: 18
};

const STORAGE_KEY = 'axessible-expressive-settings';

export function loadExpressiveSettings(): ExpressiveSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to load expressive settings:', error);
  }
  return DEFAULT_SETTINGS;
}

export function saveExpressiveSettings(settings: ExpressiveSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save expressive settings:', error);
  }
}

interface ExpressiveSettingsProps {
  value: ExpressiveSettings;
  onChange: (settings: ExpressiveSettings) => void;
}

export function ExpressiveSettingsPanel({ value, onChange }: ExpressiveSettingsProps) {
  const updateSetting = <K extends keyof ExpressiveSettings>(
    key: K,
    newValue: ExpressiveSettings[K]
  ) => {
    const updated = { ...value, [key]: newValue };
    onChange(updated);
    saveExpressiveSettings(updated);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expressive Captions Settings</CardTitle>
        <CardDescription>
          Configure emotion-driven caption styling and intensity detection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-semibold">Enable Expressive Captions</Label>
            <p className="text-sm text-muted-foreground">
              Activate emotion and intensity-based caption rendering
            </p>
          </div>
          <Switch
            checked={value.enabled}
            onCheckedChange={(c) => updateSetting('enabled', c)}
          />
        </div>

        <Separator />

        {/* Advanced Features */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Advanced Features</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Dynamic Font Sizing 🆕</Label>
              <p className="text-sm text-muted-foreground">
                Whispers appear smaller, yelling appears larger
              </p>
            </div>
            <Switch
              checked={value.dynamicSizing}
              onCheckedChange={(c) => updateSetting('dynamicSizing', c)}
              disabled={!value.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Sentiment Badge</Label>
              <p className="text-sm text-muted-foreground">
                Display emotion indicators (positive/negative/neutral)
              </p>
            </div>
            <Switch
              checked={value.showSentimentBadge}
              onCheckedChange={(c) => updateSetting('showSentimentBadge', c)}
              disabled={!value.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Highlight Pitch Variations</Label>
              <p className="text-sm text-muted-foreground">
                Visual cues for high/low pitch changes
              </p>
            </div>
            <Switch
              checked={value.highlightPitch}
              onCheckedChange={(c) => updateSetting('highlightPitch', c)}
              disabled={!value.enabled}
            />
          </div>
        </div>

        <Separator />

        {/* EC Protocol */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">EC Protocol Features</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Use Expressive Styles</Label>
              <p className="text-sm text-muted-foreground">
                ALL CAPS for emphasis, bold text for intensity
              </p>
            </div>
            <Switch
              checked={value.useStyles}
              onCheckedChange={(c) => updateSetting('useStyles', c)}
              disabled={!value.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Lengthen Words</Label>
              <p className="text-sm text-muted-foreground">
                Elongate vowels for sustained sounds (e.g., "noooo")
              </p>
            </div>
            <Switch
              checked={value.lengthenWords}
              onCheckedChange={(c) => updateSetting('lengthenWords', c)}
              disabled={!value.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Sound Labels</Label>
              <p className="text-sm text-muted-foreground">
                Display [laughter], [applause], etc.
              </p>
            </div>
            <Switch
              checked={value.showSoundLabels}
              onCheckedChange={(c) => updateSetting('showSoundLabels', c)}
              disabled={!value.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Environmental Sounds</Label>
              <p className="text-sm text-muted-foreground">
                Include background sounds and effects
              </p>
            </div>
            <Switch
              checked={value.showEnvironmentalSounds}
              onCheckedChange={(c) => updateSetting('showEnvironmentalSounds', c)}
              disabled={!value.enabled}
            />
          </div>
        </div>

        <Separator />

        {/* Intensity Thresholds */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Intensity Thresholds</h3>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Whisper Threshold (dB)</Label>
              <span className="text-sm text-muted-foreground">{value.whisperThreshold}</span>
            </div>
            <Slider
              value={[value.whisperThreshold]}
              onValueChange={([v]) => updateSetting('whisperThreshold', v)}
              min={-40}
              max={-15}
              step={1}
              disabled={!value.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Audio below this level is considered a whisper
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Yell Threshold (dB)</Label>
              <span className="text-sm text-muted-foreground">{value.yellThreshold}</span>
            </div>
            <Slider
              value={[value.yellThreshold]}
              onValueChange={([v]) => updateSetting('yellThreshold', v)}
              min={-20}
              max={0}
              step={1}
              disabled={!value.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Audio above this level is considered yelling
            </p>
          </div>
        </div>

        <Separator />

        {/* Accessibility */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Accessibility</h3>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Minimum Font Size (px)</Label>
              <span className="text-sm text-muted-foreground">{value.minFontSize}</span>
            </div>
            <Slider
              value={[value.minFontSize]}
              onValueChange={([v]) => updateSetting('minFontSize', v)}
              min={12}
              max={32}
              step={1}
              disabled={!value.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Smallest allowed font size for whispers
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Reduce Motion</Label>
              <p className="text-sm text-muted-foreground">
                Minimize animations for accessibility
              </p>
            </div>
            <Switch
              checked={value.reduceMotion}
              onCheckedChange={(c) => updateSetting('reduceMotion', c)}
              disabled={!value.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>High Contrast Mode</Label>
              <p className="text-sm text-muted-foreground">
                Increase text contrast for better readability
              </p>
            </div>
            <Switch
              checked={value.highContrast}
              onCheckedChange={(c) => updateSetting('highContrast', c)}
              disabled={!value.enabled}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

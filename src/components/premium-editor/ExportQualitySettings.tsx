import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Settings, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  Gauge
} from 'lucide-react';
import {
  VIDEO_CODECS,
  QUALITY_PRESETS,
  isCodecSupported,
  getRecommendedCodec,
  getCodecWarnings,
  formatBitrate,
  estimateFileSize,
  type CodecInfo,
  type QualityPreset
} from '@/lib/videoCodecs';

interface ExportQualitySettingsProps {
  videoDuration?: number;
  hasAlpha?: boolean;
  hasHDR?: boolean;
  onSettingsChange?: (settings: ExportSettings) => void;
}

export interface ExportSettings {
  codec: string;
  quality: string;
  videoBitrate: number;
  audioBitrate: number;
  maxWidth?: number;
  maxHeight?: number;
  fps?: number;
  keyFrameInterval?: number;
}

export function ExportQualitySettings({ 
  videoDuration = 60, 
  hasAlpha = false,
  hasHDR = false,
  onSettingsChange 
}: ExportQualitySettingsProps) {
  const [selectedCodec, setSelectedCodec] = useState<string>('avc');
  const [selectedQuality, setSelectedQuality] = useState<string>('medium');
  const [customVideoBitrate, setCustomVideoBitrate] = useState(2500);
  const [customAudioBitrate, setCustomAudioBitrate] = useState(128);

  const codec = VIDEO_CODECS[selectedCodec];
  const quality = QUALITY_PRESETS[selectedQuality];
  const isCustom = selectedQuality === 'custom';

  useEffect(() => {
    // Auto-select recommended codec based on video properties
    const recommended = getRecommendedCodec({
      needsAlpha: hasAlpha,
      needsHDR: hasHDR,
      maxCompatibility: false,
      bestCompression: false
    });
    setSelectedCodec(recommended);
  }, [hasAlpha, hasHDR]);

  useEffect(() => {
    if (onSettingsChange) {
      const settings: ExportSettings = {
        codec: selectedCodec,
        quality: selectedQuality,
        videoBitrate: isCustom ? customVideoBitrate * 1000 : quality.videoBitrate,
        audioBitrate: isCustom ? customAudioBitrate * 1000 : quality.audioBitrate,
        maxWidth: quality.maxWidth,
        maxHeight: quality.maxHeight,
        fps: quality.fps,
        keyFrameInterval: quality.keyFrameInterval
      };
      onSettingsChange(settings);
    }
  }, [selectedCodec, selectedQuality, customVideoBitrate, customAudioBitrate]);

  const warnings = getCodecWarnings(selectedCodec);
  const isSupported = isCodecSupported(selectedCodec);

  const totalBitrate = isCustom 
    ? (customVideoBitrate + customAudioBitrate) * 1000
    : quality.videoBitrate + quality.audioBitrate;

  const estimatedSize = estimateFileSize(videoDuration, totalBitrate);

  return (
    <div className="space-y-4">
      {/* Codec Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Video Codec
          </CardTitle>
          <CardDescription className="text-xs">
            Choose output format and compression
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Codec</Label>
            <Select value={selectedCodec} onValueChange={setSelectedCodec}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(VIDEO_CODECS).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <span>{c.name}</span>
                      {isCodecSupported(c.id) ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-yellow-500" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Codec Info */}
          {codec && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
              <div className="text-sm">{codec.description}</div>
              
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs">
                  {codec.fileExtension.toUpperCase()}
                </Badge>
                {codec.supportsAlpha && (
                  <Badge variant="outline" className="text-xs bg-primary/10">
                    Alpha
                  </Badge>
                )}
                {codec.supportsHDR && (
                  <Badge variant="outline" className="text-xs bg-accent/10">
                    HDR
                  </Badge>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                <div className="font-medium mb-1">Recommended for:</div>
                <div>{codec.recommendedFor.join(', ')}</div>
              </div>

              {/* Browser Support */}
              <div className="text-xs">
                <div className="font-medium mb-1 text-muted-foreground">Browser Support:</div>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(codec.browserSupport).map(([browser, supported]) => (
                    <Badge 
                      key={browser} 
                      variant={supported ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {browser}: {supported ? '✓' : '✗'}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {!isSupported && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                This codec may not be supported in your current browser
              </AlertDescription>
            </Alert>
          )}

          {warnings.length > 0 && isSupported && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs space-y-1">
                {warnings.map((warning, idx) => (
                  <div key={idx}>• {warning}</div>
                ))}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Quality Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            Quality Settings
          </CardTitle>
          <CardDescription className="text-xs">
            Balance quality and file size
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Quality Preset</Label>
            <Select value={selectedQuality} onValueChange={setSelectedQuality}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(QUALITY_PRESETS).map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    <div className="flex flex-col items-start">
                      <span>{preset.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {preset.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isCustom ? (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Video Bitrate</div>
                  <div className="font-medium">{formatBitrate(quality.videoBitrate)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Audio Bitrate</div>
                  <div className="font-medium">{formatBitrate(quality.audioBitrate)}</div>
                </div>
                {quality.maxWidth && (
                  <div>
                    <div className="text-xs text-muted-foreground">Max Resolution</div>
                    <div className="font-medium">{quality.maxWidth}x{quality.maxHeight}</div>
                  </div>
                )}
                {quality.fps && (
                  <div>
                    <div className="text-xs text-muted-foreground">Frame Rate</div>
                    <div className="font-medium">{quality.fps} fps</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Custom Video Bitrate */}
              <div className="space-y-2">
                <Label className="text-xs">
                  Video Bitrate: {formatBitrate(customVideoBitrate * 1000)}
                </Label>
                <Slider
                  value={[customVideoBitrate]}
                  onValueChange={([value]) => setCustomVideoBitrate(value)}
                  min={500}
                  max={20000}
                  step={100}
                  className="w-full"
                />
              </div>

              {/* Custom Audio Bitrate */}
              <div className="space-y-2">
                <Label className="text-xs">
                  Audio Bitrate: {formatBitrate(customAudioBitrate * 1000)}
                </Label>
                <Slider
                  value={[customAudioBitrate]}
                  onValueChange={([value]) => setCustomAudioBitrate(value)}
                  min={64}
                  max={320}
                  step={16}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* File Size Estimate */}
          <div className="p-3 bg-primary/10 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estimated File Size:</span>
              <span className="text-sm font-bold">{estimatedSize}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Based on {videoDuration.toFixed(1)}s duration
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

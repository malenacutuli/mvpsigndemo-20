import React, { useState } from 'react';
import { Upload, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VoiceCloningUploaderProps {
  onVoiceCloned: (voiceId: string, voiceName: string) => void;
  contentType: string;
}

export const VoiceCloningUploader: React.FC<VoiceCloningUploaderProps> = ({
  onVoiceCloned,
  contentType
}) => {
  const [uploading, setUploading] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [voiceName, setVoiceName] = useState('');
  const [cloned, setCloned] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('audio/') || file.type === 'video/mp4') {
        setAudioFile(file);
        if (!voiceName) {
          setVoiceName(`Custom ${contentType} Voice`);
        }
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select an audio file (MP3, WAV, etc.) or MP4 video",
          variant: "destructive"
        });
      }
    }
  };

  const cloneVoice = async () => {
    if (!audioFile || !voiceName.trim()) {
      toast({
        title: "Missing information",
        description: "Please select an audio file and enter a voice name",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);

      // Convert file to base64
      const fileReader = new FileReader();
      const base64Audio = await new Promise<string>((resolve, reject) => {
        fileReader.onload = () => {
          const result = fileReader.result as string;
          // Remove data URL prefix
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        fileReader.onerror = reject;
        fileReader.readAsDataURL(audioFile);
      });

      // Call the voice cloning edge function
      const { data, error } = await supabase.functions.invoke('voice-cloning', {
        body: {
          audioBase64: base64Audio,
          voiceName: voiceName.trim(),
          language: 'en' // Default to English for now
        }
      });

      if (error) {
        throw error;
      }

      if (data.success && data.voiceId) {
        setCloned(true);
        toast({
          title: "Voice cloned successfully",
          description: `Your custom voice "${voiceName}" is ready to use`,
        });
        
        // Notify parent component
        onVoiceCloned(data.voiceId, voiceName);
      } else {
        throw new Error(data.error || 'Voice cloning failed');
      }

    } catch (error) {
      console.error('Voice cloning error:', error);
      toast({
        title: "Voice cloning failed",
        description: error instanceof Error ? error.message : "An error occurred during voice cloning",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setAudioFile(null);
    setVoiceName('');
    setCloned(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Upload className="w-4 h-4" />
          Clone Your Voice
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!cloned ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="voice-name">Voice Name</Label>
              <Input
                id="voice-name"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder={`Custom ${contentType} Voice`}
                disabled={uploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="audio-upload">Audio Sample</Label>
              <div
                className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById('audio-upload')?.click()}
              >
                <input
                  id="audio-upload"
                  type="file"
                  accept="audio/*,video/mp4"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {audioFile ? (
                  <div>
                    <p className="text-sm font-medium">{audioFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm">Upload audio sample</p>
                    <p className="text-xs text-muted-foreground">
                      MP3, WAV, or MP4 (30sec - 5min recommended)
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={cloneVoice}
              disabled={!audioFile || !voiceName.trim() || uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cloning Voice...
                </>
              ) : (
                'Clone Voice'
              )}
            </Button>
          </>
        ) : (
          <div className="text-center space-y-3">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
            <div>
              <p className="font-medium">Voice Cloned Successfully!</p>
              <p className="text-sm text-muted-foreground">"{voiceName}" is ready to use</p>
            </div>
            <Button variant="outline" onClick={reset} className="w-full">
              Clone Another Voice
            </Button>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Upload a clear audio sample of your voice</p>
          <p>• 30 seconds to 5 minutes is recommended</p>
          <p>• Avoid background noise for best results</p>
        </div>
      </CardContent>
    </Card>
  );
};
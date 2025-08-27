import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Mic, MicOff, Play, Square, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface VoiceCloningControlsProps {
  onVoiceCloned: (voiceId: string, voiceName: string) => void;
  currentLanguage: string;
}

export const VoiceCloningControls: React.FC<VoiceCloningControlsProps> = ({
  onVoiceCloned,
  currentLanguage,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clonedVoices, setClonedVoices] = useState<Array<{ id: string; name: string; language: string }>>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info('Recording started. Speak for at least 30 seconds for best results.');
    } catch (error) {
      toast.error('Could not start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioBlob(file);
    } else {
      toast.error('Please select a valid audio file');
    }
  };

  const playPreview = () => {
    if (audioBlob && audioPreviewRef.current) {
      const audioUrl = URL.createObjectURL(audioBlob);
      audioPreviewRef.current.src = audioUrl;
      audioPreviewRef.current.play();
    }
  };

  const cloneVoice = async () => {
    if (!audioBlob) {
      toast.error('Please record or upload an audio sample first');
      return;
    }

    setIsProcessing(true);
    try {
      // Convert audio to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onload = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        if (!base64Audio) {
          throw new Error('Failed to process audio file');
        }

        const { data, error } = await supabase.functions.invoke('voice-cloning', {
          body: {
            audioBase64: base64Audio,
            voiceName: `Cloned Voice ${Date.now()}`,
            language: currentLanguage,
          }
        });

        if (error) throw error;

        const newVoice = {
          id: data.voiceId,
          name: data.voiceName,
          language: currentLanguage,
        };

        setClonedVoices(prev => [...prev, newVoice]);
        onVoiceCloned(data.voiceId, data.voiceName);
        
        toast.success('Voice cloned successfully!');
        setAudioBlob(null);
      };
    } catch (error: any) {
      console.error('Voice cloning error:', error);
      toast.error(error.message || 'Failed to clone voice');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border border-muted/20 rounded-lg">
      <h4 className="text-sm font-medium text-white">Voice Cloning & Custom Voices</h4>
      
      {/* Recording Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={isRecording ? stopRecording : startRecording}
          className={`text-white hover:bg-white/20 ${isRecording ? 'bg-red-500/30' : ''}`}
          disabled={isProcessing}
        >
          {isRecording ? (
            <>
              <Square className="w-4 h-4 mr-2" />
              Stop ({Math.floor(Date.now() / 1000) % 60}s)
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 mr-2" />
              Record Voice
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="text-white hover:bg-white/20"
          disabled={isProcessing}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Audio
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Audio Preview */}
      {audioBlob && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost" 
            size="sm"
            onClick={playPreview}
            className="text-white hover:bg-white/20"
          >
            <Play className="w-3 h-3 mr-1" />
            Preview
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={cloneVoice}
            disabled={isProcessing}
            className="text-white hover:bg-white/20"
          >
            <Volume2 className="w-3 h-3 mr-1" />
            {isProcessing ? 'Cloning...' : 'Clone Voice'}
          </Button>
        </div>
      )}

      {/* Cloned Voices List */}
      {clonedVoices.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-white/70">Your Cloned Voices</h5>
          {clonedVoices.map((voice) => (
            <div key={voice.id} className="text-xs text-white/60 p-2 bg-white/5 rounded">
              {voice.name} ({voice.language})
            </div>
          ))}
        </div>
      )}

      <audio ref={audioPreviewRef} className="hidden" />
    </div>
  );
};
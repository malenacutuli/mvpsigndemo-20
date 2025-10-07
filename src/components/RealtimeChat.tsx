import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, VolumeX, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AudioRecorder {
  stream: MediaStream | null;
  audioContext: AudioContext | null;
  processor: ScriptProcessorNode | null;
  source: MediaStreamAudioSourceNode | null;
}

interface RealtimeChatProps {
  onTranscript?: (text: string) => void;
  onFunctionCall?: (name: string, args: any) => void;
  className?: string;
}

class AudioQueue {
  private queue: Uint8Array[] = [];
  private isPlaying = false;
  private audioContext: AudioContext;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  async addToQueue(audioData: Uint8Array) {
    console.log('Adding audio to queue, current queue length:', this.queue.length);
    this.queue.push(audioData);
    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      console.log('Audio queue empty, stopping playback');
      return;
    }

    this.isPlaying = true;
    const audioData = this.queue.shift()!;
    console.log('Playing next audio chunk, size:', audioData.length);

    try {
      const wavData = this.createWavFromPCM(audioData);
      const audioBuffer = await this.audioContext.decodeAudioData(wavData.buffer as ArrayBuffer);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => {
        console.log('Audio chunk finished, playing next');
        this.playNext();
      };
      
      source.start(0);
    } catch (error) {
      console.error('Error playing audio:', error);
      this.playNext(); // Continue with next segment even if current fails
    }
  }

  private createWavFromPCM(pcmData: Uint8Array): Uint8Array {
    console.log('Creating WAV from PCM data, size:', pcmData.length);
    
    // Convert bytes to 16-bit samples (little endian)
    const int16Data = new Int16Array(pcmData.length / 2);
    for (let i = 0; i < pcmData.length; i += 2) {
      int16Data[i / 2] = (pcmData[i + 1] << 8) | pcmData[i];
    }
    
    // Create WAV header
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // WAV header parameters
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;

    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + int16Data.byteLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, int16Data.byteLength, true);

    // Combine header and data
    const wavArray = new Uint8Array(wavHeader.byteLength + int16Data.byteLength);
    wavArray.set(new Uint8Array(wavHeader), 0);
    wavArray.set(new Uint8Array(int16Data.buffer), wavHeader.byteLength);
    
    return wavArray;
  }
}

const encodeAudioForAPI = (float32Array: Float32Array): string => {
  console.log('Encoding audio for API, samples:', float32Array.length);
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
};

let audioQueueInstance: AudioQueue | null = null;

export const RealtimeChat: React.FC<RealtimeChatProps> = ({
  onTranscript,
  onFunctionCall,
  className = ""
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [messages, setMessages] = useState<Array<{type: 'user' | 'assistant', content: string}>>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioRecorderRef = useRef<AudioRecorder>({
    stream: null,
    audioContext: null,
    processor: null,
    source: null
  });
  const audioContextRef = useRef<AudioContext | null>(null);

  const initializeAudio = useCallback(async () => {
    try {
      console.log('Initializing audio context...');
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      if (!audioQueueInstance) {
        audioQueueInstance = new AudioQueue(audioContextRef.current);
        console.log('Audio queue initialized');
      }
    } catch (error) {
      console.error('Error initializing audio:', error);
      toast.error('Failed to initialize audio system');
    }
  }, []);

  const connectWebSocket = useCallback(async () => {
    try {
      console.log('Connecting to WebSocket...');
      
      // Use the correct Supabase project URL
      const wsUrl = 'wss://faeyekynudyzeotbjfsj.functions.supabase.co/openai-realtime';
      console.log('WebSocket URL:', wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        toast.success('Connected to AI assistant');
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        toast.info('Disconnected from AI assistant');
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        toast.error('Connection error');
      };

      wsRef.current.onmessage = async (event) => {
        console.log('WebSocket message received:', event.data);
        try {
          const data = JSON.parse(event.data);
          console.log('Parsed message type:', data.type);
          
          switch (data.type) {
            case 'response.audio.delta':
              if (audioQueueInstance && !isMuted) {
                console.log('Received audio delta, processing...');
                const binaryString = atob(data.delta);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                await audioQueueInstance.addToQueue(bytes);
              }
              break;
              
            case 'response.audio_transcript.delta':
              console.log('Audio transcript delta:', data.delta);
              setCurrentTranscript(prev => prev + data.delta);
              if (onTranscript) {
                onTranscript(data.delta);
              }
              break;
              
            case 'response.audio_transcript.done':
              console.log('Audio transcript complete:', currentTranscript);
              setMessages(prev => [...prev, { type: 'assistant', content: currentTranscript }]);
              setCurrentTranscript('');
              break;
              
            case 'response.function_call_arguments.done':
              console.log('Function call done:', data);
              if (onFunctionCall) {
                try {
                  const args = JSON.parse(data.arguments);
                  onFunctionCall(data.name, args);
                } catch (error) {
                  console.error('Error parsing function arguments:', error);
                }
              }
              break;
              
            case 'input_audio_buffer.speech_started':
              console.log('User started speaking');
              break;
              
            case 'input_audio_buffer.speech_stopped':
              console.log('User stopped speaking');
              break;
              
            default:
              console.log('Unhandled message type:', data.type);
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      };
      
    } catch (error) {
      console.error('Error connecting WebSocket:', error);
      toast.error('Failed to connect to AI assistant');
    }
  }, [isMuted, onTranscript, onFunctionCall, currentTranscript]);

  const startRecording = async () => {
    try {
      console.log('Starting audio recording...');
      
      const recorder = audioRecorderRef.current;
      recorder.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      recorder.audioContext = new AudioContext({ sampleRate: 24000 });
      recorder.source = recorder.audioContext.createMediaStreamSource(recorder.stream);
      recorder.processor = recorder.audioContext.createScriptProcessor(4096, 1, 1);
      
      recorder.processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const encodedAudio = encodeAudioForAPI(new Float32Array(inputData));
          
          wsRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: encodedAudio
          }));
        }
      };
      
      recorder.source.connect(recorder.processor);
      recorder.processor.connect(recorder.audioContext.destination);
      
      setIsRecording(true);
      console.log('Recording started');
      toast.success('Recording started');
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const stopRecording = () => {
    console.log('Stopping audio recording...');
    const recorder = audioRecorderRef.current;
    
    if (recorder.source) {
      recorder.source.disconnect();
      recorder.source = null;
    }
    if (recorder.processor) {
      recorder.processor.disconnect();
      recorder.processor = null;
    }
    if (recorder.stream) {
      recorder.stream.getTracks().forEach(track => track.stop());
      recorder.stream = null;
    }
    if (recorder.audioContext) {
      recorder.audioContext.close();
      recorder.audioContext = null;
    }
    
    setIsRecording(false);
    console.log('Recording stopped');
    toast.info('Recording stopped');
  };

  const sendTextMessage = (text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('Sending text message:', text);
      
      const event = {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: text
            }
          ]
        }
      };
      
      wsRef.current.send(JSON.stringify(event));
      wsRef.current.send(JSON.stringify({ type: 'response.create' }));
      
      setMessages(prev => [...prev, { type: 'user', content: text }]);
    }
  };

  useEffect(() => {
    initializeAudio();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [initializeAudio]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      stopRecording();
    };
  }, []);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Live AI Assistant
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Controls */}
        <div className="flex gap-2">
          <Button
            onClick={isConnected ? () => wsRef.current?.close() : connectWebSocket}
            variant={isConnected ? "destructive" : "default"}
          >
            {isConnected ? "Disconnect" : "Connect"}
          </Button>
          
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!isConnected}
            variant={isRecording ? "destructive" : "default"}
          >
            {isRecording ? (
              <>
                <MicOff className="w-4 h-4 mr-2" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Start Recording
              </>
            )}
          </Button>
          
          <Button
            onClick={() => setIsMuted(!isMuted)}
            variant="outline"
            disabled={!isConnected}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Current Transcript */}
        {currentTranscript && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">AI is speaking...</span>
            </div>
            <p className="text-sm">{currentTranscript}</p>
          </div>
        )}

        {/* Messages */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {messages.slice(-5).map((msg, i) => (
            <div
              key={i}
              className={`p-2 rounded-lg text-sm ${
                msg.type === 'user' 
                  ? 'bg-primary text-primary-foreground ml-8' 
                  : 'bg-muted mr-8'
              }`}
            >
              {msg.content}
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => sendTextMessage("Help me make my video more accessible")}
            disabled={!isConnected}
          >
            Accessibility Help
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => sendTextMessage("Create captions for my video")}
            disabled={!isConnected}
          >
            Generate Captions
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => sendTextMessage("Add audio descriptions")}
            disabled={!isConnected}
          >
            Audio Descriptions
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p><strong>Real-time AI:</strong> Voice-to-voice accessibility assistance</p>
          <p><strong>Live Help:</strong> Get instant guidance for video accessibility</p>
          <p><strong>Smart Tools:</strong> AI-powered caption and description generation</p>
        </div>
      </CardContent>
    </Card>
  );
};
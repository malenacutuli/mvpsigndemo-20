import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Mic, Eye, AlertCircle, CheckCircle } from 'lucide-react';
import { useAdvancedSpeakerAnalysis } from '@/hooks/useAdvancedSpeakerAnalysis';

interface SpeakerInfo {
  id: string;
  name: string;
  color: string;
  segmentCount: number;
  totalTimeSeconds: number;
}

interface SpeakerIdentificationPanelProps {
  videoUrl?: string;
  videoId?: string;
  onSpeakersIdentified?: (speakers: SpeakerInfo[]) => void;
}

export const SpeakerIdentificationPanel: React.FC<SpeakerIdentificationPanelProps> = ({
  videoUrl,
  videoId,
  onSpeakersIdentified
}) => {
  const [speakers, setSpeakers] = useState<SpeakerInfo[]>([]);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { analyzeSpeakersFromAudio, isAnalyzing } = useAdvancedSpeakerAnalysis();

  const handleIdentifySpeakers = async () => {
    if (!videoUrl || !videoId) {
      setError('Video URL and ID are required for speaker identification');
      return;
    }

    setError(null);
    setAnalysisComplete(false);

    try {
      console.log('🎤 Starting speaker identification...');
      const clusters = await analyzeSpeakersFromAudio(videoUrl, videoId);
      
      if (clusters.length === 0) {
        setError('No speakers could be identified in this video');
        return;
      }

      const speakerInfo: SpeakerInfo[] = clusters.map(cluster => ({
        id: cluster.id,
        name: cluster.name,
        color: cluster.color,
        segmentCount: cluster.segments.length,
        totalTimeSeconds: cluster.segments.reduce(
          (total, segment) => total + (segment.endTime - segment.startTime), 
          0
        )
      }));

      setSpeakers(speakerInfo);
      setAnalysisComplete(true);
      
      if (onSpeakersIdentified) {
        onSpeakersIdentified(speakerInfo);
      }

      console.log('✅ Speaker identification complete:', speakerInfo);
      
    } catch (err: any) {
      console.error('❌ Speaker identification failed:', err);
      setError(err.message || 'Failed to identify speakers');
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Speaker Identification
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Automatically identify and assign colors to different speakers to help deaf and hard-of-hearing users distinguish between speakers.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Identification Controls */}
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleIdentifySpeakers}
            disabled={isAnalyzing || !videoUrl || !videoId}
            className="flex items-center gap-2"
          >
            <Mic className="w-4 h-4" />
            {isAnalyzing ? 'Analyzing Audio...' : 'Identify Speakers'}
          </Button>
          
          {isAnalyzing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              This may take 1-2 minutes for longer videos
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        {/* Success Message */}
        {analysisComplete && speakers.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-700 dark:text-green-400">
              Successfully identified {speakers.length} speaker{speakers.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Speaker Results */}
        {speakers.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Identified Speakers ({speakers.length})
            </h4>
            
            <div className="grid gap-2">
              {speakers.map((speaker) => (
                <div 
                  key={speaker.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: speaker.color }}
                    />
                    <span className="font-medium">{speaker.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline">
                      {speaker.segmentCount} segments
                    </Badge>
                    <Badge variant="outline">
                      {formatTime(speaker.totalTimeSeconds)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!analysisComplete && (
          <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-sm text-muted-foreground">
              <strong>How it works:</strong> Our AI analyzes the audio track to identify distinct speakers based on voice characteristics, then assigns high-contrast colors to help users distinguish between speakers in the captions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
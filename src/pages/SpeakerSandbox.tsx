import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RefreshCw, Settings, Play, Pause, Database, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useVideoStorage } from '@/hooks/useVideoStorage';
import { AxessiblePlayer } from '@/components/AxessiblePlayer';
import { SpeakerCorrectionInterface } from '@/components/SpeakerCorrectionInterface';

// Test video ID from route - hardcoded for now
const TEST_VIDEO_ID = '2f9a71a2-0c14-44e7-b0c8-499eb996e28f';
const TEST_VIDEO_URL = 'https://faeyekynudyzeotbjfsj.supabase.co/storage/v1/object/public/videos/2f9a71a2-0c14-44e7-b0c8-499eb996e28f.mp4';

export const SpeakerSandbox: React.FC = () => {
  // Data states
  const [dbSegments, setDbSegments] = useState<any[]>([]);
  const [rawSegments, setRawSegments] = useState<any[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [diarizationLogs, setDiarizationLogs] = useState<string[]>([]);
  
  // UI states
  const [useDbData, setUseDbData] = useState(true);
  const [showLogs, setShowLogs] = useState(true);
  const [isRunningDiarization, setIsRunningDiarization] = useState(false);
  
  const { loadTranscriptSegments, loadCharacters, loadSpeakerMappings } = useVideoStorage(TEST_VIDEO_ID);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDiarizationLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Load all data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    addLog('Loading data from database...');
    
    try {
      // Load DB segments
      const segments = await loadTranscriptSegments('en');
      setDbSegments(segments);
      addLog(`Loaded ${segments.length} segments from database`);
      
      // Load characters
      const chars = await loadCharacters();
      setCharacters(chars);
      addLog(`Loaded ${chars.length} characters: ${chars.map(c => c.name).join(', ')}`);
      
      // Load mappings
      const maps = await loadSpeakerMappings('en');
      setMappings(maps);
      addLog(`Loaded mappings: ${JSON.stringify(maps)}`);
      
    } catch (error) {
      addLog(`Error loading data: ${error}`);
    }
  };

  const runRawTranscription = async () => {
    addLog('Starting raw transcription...');
    setIsRunningDiarization(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('transcribe', {
        body: { 
          videoUrl: TEST_VIDEO_URL,
          videoId: TEST_VIDEO_ID,
          rangeBytes: 15000000
        }
      });
      
      if (error) throw error;
      
      let segments: any[] = [];
      if (data.segments && Array.isArray(data.segments)) {
        segments = data.segments.map((seg: any, index: number) => ({
          text: seg.text || '',
          startTime: Number(seg.start) || 0,
          endTime: Number(seg.end) || 0,
          speaker: `RawSpeaker${(index % 4) + 1}`,
          speakerColor: ['#E5E517', '#17E5E5', '#E51717', '#E58017'][index % 4],
          source: 'raw'
        }));
      }
      
      setRawSegments(segments);
      addLog(`Raw transcription complete: ${segments.length} segments`);
      
    } catch (error) {
      addLog(`Raw transcription failed: ${error}`);
    } finally {
      setIsRunningDiarization(false);
    }
  };

  const runSpeakerDiarization = async () => {
    addLog('Starting speaker diarization...');
    setIsRunningDiarization(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('speaker-diarization', {
        body: {
          videoId: TEST_VIDEO_ID,
          videoUrl: TEST_VIDEO_URL,
          analysisDepth: 'advanced',
          minSpeakerDuration: 1.5,
          confidenceThreshold: 0.65
        }
      });
      
      if (error) throw error;
      
      addLog(`Diarization result: ${data?.success ? 'SUCCESS' : 'FAILED'}`);
      if (data?.speakers) {
        addLog(`Identified ${data.speakers.length} speakers`);
        data.speakers.forEach((speaker: any) => {
          addLog(`- ${speaker.name}: ${speaker.segmentCount} segments, ${speaker.totalTime}s`);
        });
      }
      
      // Reload DB data to see changes
      await loadAllData();
      
    } catch (error) {
      addLog(`Diarization failed: ${error}`);
    } finally {
      setIsRunningDiarization(false);
    }
  };

  const currentSegments = useDbData ? dbSegments : rawSegments;
  const currentSource = useDbData ? 'Database (Mapped)' : 'Raw Transcription';

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Speaker Identification Lab
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Testing environment for video: {TEST_VIDEO_ID.slice(0, 8)}...
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="data-source"
                    checked={useDbData}
                    onCheckedChange={setUseDbData}
                  />
                  <Label htmlFor="data-source" className="flex items-center gap-1">
                    {useDbData ? <Database className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    {currentSource}
                  </Label>
                </div>
                <Badge variant={useDbData ? "default" : "secondary"}>
                  {currentSegments.length} segments
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Button 
                onClick={runRawTranscription} 
                disabled={isRunningDiarization}
                variant="outline"
              >
                {isRunningDiarization ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                Raw Transcribe
              </Button>
              <Button 
                onClick={runSpeakerDiarization} 
                disabled={isRunningDiarization}
              >
                {isRunningDiarization ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Settings className="w-4 h-4 mr-2" />}
                Run Diarization
              </Button>
              <Button 
                onClick={loadAllData} 
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Player */}
          <Card>
            <CardHeader>
              <CardTitle>Video Player (Always-On Captions)</CardTitle>
            </CardHeader>
            <CardContent>
              <AxessiblePlayer
                videoSrc={TEST_VIDEO_URL}
                title="Speaker Test Video"
                videoId={TEST_VIDEO_ID}
                initialCaptions={currentSegments.map(seg => ({
                  text: seg.text,
                  speaker: seg.speaker || 'Unknown',
                  startTime: seg.startTime || seg.start_time || 0,
                  endTime: seg.endTime || seg.end_time || 0,
                  speakerColor: seg.speakerColor || seg.speaker_color || '#666',
                  words: seg.words || []
                }))}
                contentType="education"
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Logs & Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Real-time Logs & Analysis</CardTitle>
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-logs"
                  checked={showLogs}
                  onCheckedChange={setShowLogs}
                />
                <Label htmlFor="show-logs">Show detailed logs</Label>
              </div>
            </CardHeader>
            <CardContent>
              {showLogs && (
                <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-64 overflow-y-auto">
                  {diarizationLogs.map((log, i) => (
                    <div key={i} className="mb-1">{log}</div>
                  ))}
                  {diarizationLogs.length === 0 && (
                    <div className="text-gray-500">Logs will appear here...</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Analysis Tabs */}
        <Tabs defaultValue="segments" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="segments">Segments ({currentSegments.length})</TabsTrigger>
            <TabsTrigger value="characters">Characters ({characters.length})</TabsTrigger>
            <TabsTrigger value="mappings">Mappings</TabsTrigger>
            <TabsTrigger value="corrections">Manual Corrections</TabsTrigger>
          </TabsList>
          
          <TabsContent value="segments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Transcript Segments - {currentSource}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {currentSegments.slice(0, 20).map((seg, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 border rounded">
                      <Badge variant="outline">{i + 1}</Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: seg.speakerColor || seg.speaker_color }}
                          />
                          <span className="font-medium">{seg.speaker}</span>
                          <span className="text-xs text-muted-foreground">
                            {(seg.startTime || seg.start_time || 0).toFixed(1)}s - {(seg.endTime || seg.end_time || 0).toFixed(1)}s
                          </span>
                        </div>
                        <p className="text-sm">{seg.text}</p>
                      </div>
                    </div>
                  ))}
                  {currentSegments.length > 20 && (
                    <div className="text-center text-muted-foreground text-sm">
                      ... and {currentSegments.length - 20} more segments
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="characters" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Character Definitions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {characters.map((char) => (
                    <div key={char.id} className="flex items-center gap-3 p-3 border rounded">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: char.color }}
                      />
                      <span className="font-medium">{char.name}</span>
                      <Badge variant="outline">{char.type}</Badge>
                      <span className="text-sm text-muted-foreground">{char.color}</span>
                    </div>
                  ))}
                  {characters.length === 0 && (
                    <p className="text-muted-foreground">No characters defined</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mappings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Speaker Mappings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(mappings).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3 p-3 border rounded">
                      <Badge variant="outline">{key}</Badge>
                      <span>→</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                  {Object.keys(mappings).length === 0 && (
                    <p className="text-muted-foreground">No mappings defined</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="corrections" className="space-y-4">
            {useDbData && (
              <SpeakerCorrectionInterface
                videoId={TEST_VIDEO_ID}
                segments={currentSegments}
                characters={characters}
                onCorrection={(corrections) => {
                  addLog(`Applied ${Object.keys(corrections).length} manual corrections`);
                  loadAllData(); // Reload to see changes
                }}
              />
            )}
            {!useDbData && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground text-center">
                    Manual corrections are only available for database segments. 
                    Switch to "Database (Mapped)" mode to use this feature.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Users, 
  FileText, 
  Settings, 
  Volume2, 
  Check, 
  AlertCircle, 
  Loader2,
  Mic,
  UserPlus,
  Save
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CharacterManager } from './CharacterManager';
import { IntonationEditor } from './IntonationEditor';

interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  data?: any;
  error?: string;
}

interface VideoAnalysisWorkflowProps {
  videoId: string;
  videoUrl?: string;
  language?: string;
  onWorkflowComplete?: (data: any) => void;
}

export const VideoAnalysisWorkflow: React.FC<VideoAnalysisWorkflowProps> = ({
  videoId,
  videoUrl,
  language = 'en',
  onWorkflowComplete
}) => {
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('not_started');
  const [isRunning, setIsRunning] = useState(false);
  const [speakerData, setSpeakerData] = useState<any>(null);
  const [characterSuggestions, setCharacterSuggestions] = useState<any[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [speakerMappings, setSpeakerMappings] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('analysis');
  const [transcriptSegments, setTranscriptSegments] = useState<any[]>([]);
  const { toast } = useToast();

  // Load existing workflow status on mount
  useEffect(() => {
    loadWorkflowStatus();
  }, [videoId]);

  // Poll for workflow status while running
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning) {
      interval = setInterval(() => {
        loadWorkflowStatus();
      }, 3000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const loadWorkflowStatus = async () => {
    try {
      const response = await supabase.functions.invoke('video-analysis-workflow', {
        body: {
          videoId,
          action: 'get_workflow_status'
        }
      });

      if (response.data?.success && response.data.workflow_data) {
        const workflowData = response.data.workflow_data;
        
        setWorkflowSteps(workflowData.steps || []);
        setCurrentStep(workflowData.current_step || 'not_started');
        
        // Check if analysis is complete and load data
        if (workflowData.current_step === 'completed') {
          setIsRunning(false);
          setSpeakerData(workflowData.speaker_data);
          setCharacterSuggestions(workflowData.character_suggestions || []);
          
          if (workflowData.ready_for_user_configuration) {
            setActiveTab('characters');
          }
        }
        
        // Auto-stop polling if workflow is complete or error
        if (['completed', 'error'].includes(workflowData.current_step)) {
          setIsRunning(false);
        }
      }
    } catch (error) {
      console.error('Failed to load workflow status:', error);
    }
  };

  const startAnalysis = async () => {
    if (!videoUrl) {
      toast({
        title: "Video URL Required",
        description: "Please provide a video URL to start analysis",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setActiveTab('analysis');

    try {
      const response = await supabase.functions.invoke('video-analysis-workflow', {
        body: {
          videoId,
          videoUrl,
          action: 'start_full_analysis',
          payload: {
            language,
            analysisDepth: 'advanced',
            confidenceThreshold: 0.65
          }
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        setSpeakerData(response.data.speaker_data);
        setCharacterSuggestions(response.data.character_suggestions || []);
        
        toast({
          title: "Analysis Complete!",
          description: `Found ${response.data.speaker_data?.speakers?.length || 0} speakers in ${response.data.total_segments || 0} segments`,
          variant: "default"
        });

        // Move to character configuration
        setActiveTab('characters');
        
        if (onWorkflowComplete) {
          onWorkflowComplete(response.data);
        }
      }
    } catch (error: any) {
      console.error('Analysis failed:', error);
      setIsRunning(false);
      
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze video. Please try again.",
        variant: "destructive"
      });
    }
  };

  const applyCharacterConfiguration = async () => {
    try {
      const response = await supabase.functions.invoke('video-analysis-workflow', {
        body: {
          videoId,
          action: 'apply_character_mappings',
          payload: {
            characters,
            speaker_mappings: speakerMappings,
            language
          }
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Characters Applied!",
        description: `Applied ${characters.length} characters and ${Object.keys(speakerMappings).length} speaker mappings`,
        variant: "default"
      });

      // Move to intonation editing
      setActiveTab('intonation');
      
      // Load transcript segments for intonation editor
      loadTranscriptSegments();
      
    } catch (error: any) {
      console.error('Failed to apply characters:', error);
      toast({
        title: "Configuration Failed",
        description: error.message || "Failed to apply character configuration",
        variant: "destructive"
      });
    }
  };

  const loadTranscriptSegments = async () => {
    try {
      const { data } = await supabase
        .from('transcript_segments')
        .select('*')
        .eq('video_id', videoId)
        .eq('language', language)
        .order('start_time');

      if (data) {
        setTranscriptSegments(data);
      }
    } catch (error) {
      console.error('Failed to load transcript segments:', error);
    }
  };

  const getStepIcon = (step: WorkflowStep) => {
    switch (step.status) {
      case 'completed':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
    }
  };

  const getStepProgress = () => {
    if (workflowSteps.length === 0) return 0;
    const completedSteps = workflowSteps.filter(s => s.status === 'completed').length;
    return (completedSteps / workflowSteps.length) * 100;
  };

  const canProceedToCharacters = currentStep === 'completed' || speakerData;
  const canProceedToIntonation = characters.length > 0 && Object.keys(speakerMappings).length > 0;

  return (
    <div className="space-y-6">
      {/* Workflow Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Video Analysis Workflow
          </CardTitle>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(getStepProgress())}%</span>
            </div>
            <Progress value={getStepProgress()} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Workflow Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Analysis
          </TabsTrigger>
          <TabsTrigger value="characters" disabled={!canProceedToCharacters} className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Characters
          </TabsTrigger>
          <TabsTrigger value="intonation" disabled={!canProceedToIntonation} className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Intonation
          </TabsTrigger>
        </TabsList>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Video & Voice Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {workflowSteps.length === 0 ? (
                <div className="text-center py-8">
                  <Button 
                    onClick={startAnalysis}
                    disabled={isRunning || !videoUrl}
                    size="lg"
                    className="flex items-center gap-2"
                  >
                    {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    Start Analysis
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Analyze video content, identify speakers by voice, and extract transcript with timestamps
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workflowSteps.map((step) => (
                    <div key={step.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      {getStepIcon(step)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{step.name}</span>
                          <Badge variant={step.status === 'completed' ? 'default' : step.status === 'error' ? 'destructive' : 'secondary'}>
                            {step.status}
                          </Badge>
                        </div>
                        {step.status === 'running' && (
                          <Progress value={step.progress} className="h-1 mt-1" />
                        )}
                        {step.error && (
                          <p className="text-sm text-destructive mt-1">{step.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Analysis Results Summary */}
              {speakerData && (
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Analysis Results:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Speakers Found:</span>
                      <div className="text-lg font-bold text-primary">{speakerData.speakers?.length || 0}</div>
                    </div>
                    <div>
                      <span className="font-medium">Total Segments:</span>
                      <div className="text-lg font-bold text-primary">{speakerData.segments?.length || 0}</div>
                    </div>
                    <div>
                      <span className="font-medium">Total Speakers:</span>
                      <div className="text-lg font-bold text-primary">{speakerData.totalSpeakers || 0}</div>
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>
                      <Badge variant="default">Ready</Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Characters Tab */}
        <TabsContent value="characters" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Step 2: Character Configuration</CardTitle>
              <Button 
                onClick={applyCharacterConfiguration}
                disabled={characters.length === 0}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Apply & Continue
              </Button>
            </CardHeader>
            <CardContent>
              <CharacterManager
                videoId={videoId}
                language={language}
                existingCharacters={characters}
                existingSpeakers={speakerData?.speakers?.map((s: any) => s.name) || []}
                onCharactersUpdate={(chars) => {
                  setCharacters(chars);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Intonation Tab */}
        <TabsContent value="intonation" className="space-y-4">
          <IntonationEditor
            videoId={videoId}
            language={language}
            segments={transcriptSegments}
            onSegmentUpdate={(segmentId, updates) => {
              setTranscriptSegments(prev => 
                prev.map(seg => 
                  seg.id === segmentId ? { ...seg, ...updates } : seg
                )
              );
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
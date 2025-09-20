import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './ui/use-toast';
import { CheckCircle, AlertCircle, Clock, Play } from 'lucide-react';

interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  data?: any;
  error?: string;
}

interface AnalysisStatusPanelProps {
  videoId: string;
  videoUrl: string;
  onAnalysisComplete?: (speakerData: any, characterSuggestions: any[]) => void;
}

export const AnalysisStatusPanel: React.FC<AnalysisStatusPanelProps> = ({
  videoId,
  videoUrl,
  onAnalysisComplete
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('not_started');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Check for existing analysis on mount
  useEffect(() => {
    checkExistingAnalysis();
  }, [videoId]);

  // Poll for status updates when analyzing
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    
    if (isAnalyzing && currentStep !== 'completed') {
      pollInterval = setInterval(pollForStatus, 2000);
    }
    
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isAnalyzing, currentStep]);

  const checkExistingAnalysis = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('video-analysis-workflow', {
        body: {
          videoId,
          action: 'get_workflow_status'
        }
      });

      if (error) {
        console.warn('Failed to check existing analysis:', error);
        return;
      }

      if (data?.workflow_data?.steps && data.workflow_data.steps.length > 0) {
        setWorkflowSteps(data.workflow_data.steps);
        setCurrentStep(data.workflow_data.current_step || 'not_started');
        
        // If analysis was completed, trigger callback
        if (data.workflow_data.current_step === 'completed' && data.workflow_data.speaker_data) {
          onAnalysisComplete?.(
            data.workflow_data.speaker_data,
            data.workflow_data.character_suggestions || []
          );
        }
      }
    } catch (err) {
      console.warn('Error checking existing analysis:', err);
    }
  };

  const pollForStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('video-analysis-workflow', {
        body: {
          videoId,
          action: 'get_workflow_status'
        }
      });

      if (error) {
        console.error('Status polling error:', error);
        return;
      }

      if (data?.workflow_data) {
        setWorkflowSteps(data.workflow_data.steps || []);
        setCurrentStep(data.workflow_data.current_step || 'not_started');

        // Check if completed
        if (data.workflow_data.current_step === 'completed') {
          setIsAnalyzing(false);
          toast({
            title: "Analysis Complete",
            description: "Video analysis finished successfully. Speaker mappings are ready.",
          });
          
          onAnalysisComplete?.(
            data.workflow_data.speaker_data,
            data.workflow_data.character_suggestions || []
          );
        }

        // Check for errors
        const errorStep = data.workflow_data.steps?.find((step: WorkflowStep) => step.status === 'error');
        if (errorStep) {
          setIsAnalyzing(false);
          setError(errorStep.error || 'Analysis failed');
          toast({
            title: "Analysis Error",
            description: errorStep.error || 'Analysis failed',
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  };

  const startAnalysis = async () => {
    if (isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      console.log('🚀 Starting full video analysis workflow...');
      
      const { data, error } = await supabase.functions.invoke('video-analysis-workflow', {
        body: {
          videoId,
          videoUrl,
          action: 'start_full_analysis',
          payload: {
            language: 'en',
            analysisDepth: 'advanced',
            confidenceThreshold: 0.65
          }
        }
      });

      if (error) {
        const friendly =
          (data as any)?.error ||
          (error as any)?.context?.response?.error ||
          'Analysis failed. Please retry.';
        throw new Error(friendly);
      }

      console.log('✅ Analysis workflow started:', data);
      
      toast({
        title: "Analysis Started",
        description: "Advanced speaker analysis is now running. This may take a few minutes.",
      });

      // Initial status check
      pollForStatus();

    } catch (err: any) {
      console.error('❌ Failed to start analysis:', err);
      setIsAnalyzing(false);
      setError(err.message || 'Failed to start analysis');
      toast({
        title: "Analysis Failed",
        description: err.message || 'Failed to start analysis',
        variant: "destructive",
      });
    }
  };

  const getStepIcon = (step: WorkflowStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStepBadge = (status: string) => {
    const variants = {
      completed: 'default',
      running: 'secondary',
      error: 'destructive',
      pending: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const isAnalysisAvailable = workflowSteps.length > 0 && currentStep !== 'not_started';
  const isCompleted = currentStep === 'completed';

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Video Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isAnalysisAvailable && !isAnalyzing && (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">
              Run advanced AI analysis to identify speakers with enhanced audio processing and fallback systems
            </p>
            <Button onClick={startAnalysis} disabled={isAnalyzing}>
              Start Full Analysis
            </Button>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
            <Button
              onClick={startAnalysis}
              variant="outline"
              size="sm"
              className="mt-2"
              disabled={isAnalyzing}
            >
              Retry Analysis
            </Button>
          </div>
        )}

        {workflowSteps.length > 0 && (
          <div className="space-y-3">
            {workflowSteps.map((step) => (
              <div key={step.id} className="flex items-center gap-3 p-3 border rounded-md">
                {getStepIcon(step)}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{step.name}</span>
                    {getStepBadge(step.status)}
                  </div>
                  {step.status === 'running' && (
                    <Progress value={step.progress} className="h-2" />
                  )}
                  {step.error && (
                    <p className="text-red-600 text-xs mt-1">{step.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

          {isCompleted && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 text-sm font-medium">
                ✅ Analysis complete. Results are ready.
              </p>
            </div>
          )}
      </CardContent>
    </Card>
  );
};
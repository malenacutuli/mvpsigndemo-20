import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { sceneManager } from '@/lib/premium-editor/scene-manager';
import { aiOrchestrator } from '@/lib/ai/orchestrator';
import { toast } from 'sonner';

interface DevTestingPanelProps {
  projectId: string;
  videoId: string;
}

export function DevTestingPanel({ projectId, videoId }: DevTestingPanelProps) {
  const [loading, setLoading] = useState(false);

  const testSceneManager = async () => {
    setLoading(true);
    try {
      const result = await sceneManager.createScene(projectId, { 
        name: 'Test Scene',
        videoId: videoId
      });
      
      if (result.success) {
        toast.success('Scene created successfully!', {
          description: `Scene ID: ${result.data?.id}`
        });
        console.log('Scene result:', result);
      } else {
        toast.error('Scene creation failed', {
          description: result.error?.message
        });
      }
    } catch (error: any) {
      toast.error('Error testing scene manager', {
        description: error.message
      });
      console.error('Scene test error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testAIFillerWords = async () => {
    setLoading(true);
    try {
      const result = await aiOrchestrator.removeFillerWords(videoId, projectId);
      
      if (result.success) {
        toast.success('Filler words detected!', {
          description: `Found ${result.data?.count} filler words`
        });
        console.log('AI result:', result);
      } else {
        toast.error('AI analysis failed', {
          description: result.error?.message
        });
      }
    } catch (error: any) {
      toast.error('Error testing AI', {
        description: error.message
      });
      console.error('AI test error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold text-sm">Developer Testing</h3>
      <div className="flex gap-2">
        <Button 
          onClick={testSceneManager} 
          disabled={loading}
          variant="outline"
          size="sm"
        >
          Test Scene Manager
        </Button>
        <Button 
          onClick={testAIFillerWords} 
          disabled={loading}
          variant="outline"
          size="sm"
        >
          Test AI Filler Words
        </Button>
      </div>
    </Card>
  );
}

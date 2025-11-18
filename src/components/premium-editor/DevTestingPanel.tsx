import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { sceneManager } from '@/lib/premium-editor/scene-manager';
import { aiOrchestrator } from '@/lib/ai/orchestrator';
import { toast } from 'sonner';
import { Sparkles, Brain, BookOpen, Scissors } from 'lucide-react';

interface DevTestingPanelProps {
  projectId: string;
  videoId: string;
}

export function DevTestingPanel({ projectId, videoId }: DevTestingPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});

  const testSceneManager = async () => {
    setLoading('scene');
    try {
      const result = await sceneManager.createScene(projectId, { 
        name: 'Test Scene',
        videoId: videoId
      });
      
      if (result.success) {
        toast.success('Scene created!', {
          description: `Scene ID: ${result.data?.id?.slice(0, 8)}...`
        });
        setResults(prev => ({ ...prev, scene: result }));
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
      setLoading(null);
    }
  };

  const testAIFillerWords = async () => {
    setLoading('filler');
    try {
      const result = await aiOrchestrator.removeFillerWords(videoId, projectId);
      
      if (result.success) {
        toast.success(`Found ${result.data?.count || 0} filler words!`, {
          description: 'Check ai_suggestions table'
        });
        setResults(prev => ({ ...prev, filler: result }));
        console.log('Filler words result:', result);
      } else {
        toast.error('AI analysis failed', {
          description: result.error?.message
        });
      }
    } catch (error: any) {
      toast.error('Error analyzing filler words', {
        description: error.message
      });
      console.error('Filler words error:', error);
    } finally {
      setLoading(null);
    }
  };

  const testAIHighlights = async () => {
    setLoading('highlights');
    try {
      const result = await aiOrchestrator.generateHighlights(videoId, 'key-points', projectId);
      
      if (result.success) {
        toast.success(`Generated ${result.data?.count || 0} highlights!`, {
          description: 'Scenes created in project'
        });
        setResults(prev => ({ ...prev, highlights: result }));
        console.log('Highlights result:', result);
      } else {
        toast.error('Highlight generation failed', {
          description: result.error?.message
        });
      }
    } catch (error: any) {
      toast.error('Error generating highlights', {
        description: error.message
      });
      console.error('Highlights error:', error);
    } finally {
      setLoading(null);
    }
  };

  const testAIChapters = async () => {
    setLoading('chapters');
    try {
      const result = await aiOrchestrator.generateChapters(videoId, projectId);
      
      if (result.success) {
        toast.success(`Generated ${result.data?.count || 0} chapters!`, {
          description: 'Check ai_suggestions table'
        });
        setResults(prev => ({ ...prev, chapters: result }));
        console.log('Chapters result:', result);
      } else {
        toast.error('Chapter generation failed', {
          description: result.error?.message
        });
      }
    } catch (error: any) {
      toast.error('Error generating chapters', {
        description: error.message
      });
      console.error('Chapters error:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <Brain className="w-4 h-4" />
        AI Testing Panel
      </h3>
      
      <div className="space-y-2">
        <Button 
          onClick={testSceneManager} 
          disabled={loading !== null}
          variant="outline"
          size="sm"
          className="w-full justify-start"
        >
          <Scissors className="w-3 h-3 mr-2" />
          {loading === 'scene' ? 'Creating...' : 'Create Test Scene'}
        </Button>

        <Button 
          onClick={testAIFillerWords} 
          disabled={loading !== null}
          variant="outline"
          size="sm"
          className="w-full justify-start"
        >
          <Sparkles className="w-3 h-3 mr-2" />
          {loading === 'filler' ? 'Analyzing...' : 'Detect Filler Words'}
        </Button>

        <Button 
          onClick={testAIHighlights} 
          disabled={loading !== null}
          variant="outline"
          size="sm"
          className="w-full justify-start"
        >
          <Sparkles className="w-3 h-3 mr-2" />
          {loading === 'highlights' ? 'Generating...' : 'Generate Highlights'}
        </Button>

        <Button 
          onClick={testAIChapters} 
          disabled={loading !== null}
          variant="outline"
          size="sm"
          className="w-full justify-start"
        >
          <BookOpen className="w-3 h-3 mr-2" />
          {loading === 'chapters' ? 'Generating...' : 'Generate Chapters'}
        </Button>
      </div>

      {Object.keys(results).length > 0 && (
        <div className="mt-3 pt-3 border-t space-y-2 text-xs">
          <p className="font-medium text-muted-foreground">Results:</p>
          {results.filler && (
            <div className="text-muted-foreground">
              • Fillers: {results.filler.data?.count || 0}
            </div>
          )}
          {results.highlights && (
            <div className="text-muted-foreground">
              • Highlights: {results.highlights.data?.count || 0}
            </div>
          )}
          {results.chapters && (
            <div className="text-muted-foreground">
              • Chapters: {results.chapters.data?.count || 0}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

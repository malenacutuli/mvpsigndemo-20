import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { sceneManager } from '@/lib/premium-editor/scene-manager';
import { aiOrchestrator } from '@/lib/ai/orchestrator';
import { toast } from 'sonner';
import { Sparkles, Brain, BookOpen, Scissors, MessageSquare } from 'lucide-react';

interface DevTestingPanelProps {
  projectId: string;
  videoId: string;
}

export function DevTestingPanel({ projectId, videoId }: DevTestingPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});
  const [commandText, setCommandText] = useState('');
  const [parsedCommand, setParsedCommand] = useState<any>(null);

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

  const testCommandParsing = async () => {
    if (!commandText.trim()) {
      toast.error('Please enter a command');
      return;
    }

    setLoading('parse');
    setParsedCommand(null);
    
    try {
      const parsed = await aiOrchestrator.parseCommand(commandText);
      setParsedCommand(parsed);
      toast.success('Command parsed!', {
        description: `Type: ${parsed.type}`
      });
      console.log('Parsed command:', parsed);
    } catch (error: any) {
      toast.error('Error parsing command', {
        description: error.message
      });
      console.error('Parse error:', error);
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

  const quickCommands = [
    'remove all filler words',
    'create funny highlights',
    'add chapters',
    'make it 2 minutes long',
    'shorten to 90 seconds'
  ];

  return (
    <Card className="p-4 space-y-4">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <Brain className="w-4 h-4" />
        AI Testing Panel
      </h3>

      {/* Command Parsing Test */}
      <div className="space-y-2 pb-3 border-b">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <MessageSquare className="w-3 h-3" />
          Command Parser
        </div>
        <div className="flex gap-2">
          <Input 
            placeholder="Try: remove all filler words"
            value={commandText}
            onChange={(e) => setCommandText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && testCommandParsing()}
            className="text-sm"
          />
          <Button 
            onClick={testCommandParsing}
            disabled={loading !== null}
            size="sm"
            variant="secondary"
          >
            {loading === 'parse' ? 'Parsing...' : 'Parse'}
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {quickCommands.map((cmd) => (
            <Button
              key={cmd}
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setCommandText(cmd)}
            >
              {cmd}
            </Button>
          ))}
        </div>
        {parsedCommand && (
          <div className="bg-muted/50 rounded p-2 text-xs font-mono">
            <div className="text-muted-foreground">Type: {parsedCommand.type}</div>
            {parsedCommand.parameters && (
              <div className="text-muted-foreground">
                Params: {JSON.stringify(parsedCommand.parameters)}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Direct Test Buttons */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">Direct Tests</div>
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
        <div className="pt-3 border-t space-y-2 text-xs">
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

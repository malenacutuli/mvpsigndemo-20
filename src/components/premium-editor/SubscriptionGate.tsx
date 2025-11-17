import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Zap, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SubscriptionGateProps {
  currentTier: string;
  videoId: string;
}

export function SubscriptionGate({ currentTier, videoId }: SubscriptionGateProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Crown className="w-16 h-16 text-primary" />
          </div>
          <CardTitle className="text-3xl">Premium Video Editor</CardTitle>
          <p className="text-muted-foreground mt-2">
            You're currently on the <strong>{currentTier}</strong> plan
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            <p className="text-center text-lg font-medium">
              Premium Video Editor is available on <strong>Standard plan and above</strong>
            </p>
            
            <div className="grid gap-3 text-sm">
              <div className="flex items-start gap-2">
                <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Text-Based Editing:</strong> Delete transcript segments to automatically trim video
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Scene Composition:</strong> Combine multiple videos with layouts and transitions
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <strong>AI Assistant:</strong> Underlord-style editing assistant with natural language commands
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Caption Templates:</strong> 10 professional CWI presets + custom template creator
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Advanced Exports:</strong> AAF timeline, DOCX transcript, separate SRT/VTT files
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate(-1)}
            >
              Go Back
            </Button>
            <Button 
              variant="default" 
              className="flex-1"
              onClick={() => navigate('/pricing')}
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Standard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

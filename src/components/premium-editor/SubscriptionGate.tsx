import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SubscriptionGateProps {
  currentTier: string;
  videoId: string;
}

export function SubscriptionGate({ currentTier, videoId }: SubscriptionGateProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <Card className="max-w-3xl w-full border-none shadow-soft">
        <CardHeader className="text-center space-y-6 pt-12">
          <div className="flex justify-center">
            <Crown className="w-20 h-20 text-primary" />
          </div>
          <CardTitle className="text-4xl md:text-5xl font-light text-foreground">
            Premium Video Editor
          </CardTitle>
          <p className="text-base md:text-lg text-muted-foreground font-light">
            You're currently on the <strong>{currentTier}</strong> plan
          </p>
        </CardHeader>
        <CardContent className="space-y-8 px-8 pb-12">
          <div className="bg-muted/30 rounded-2xl p-8 space-y-6">
            <p className="text-center text-lg md:text-xl font-light text-foreground">
              Premium Video Editor is available on <strong>Standard plan and above</strong>
            </p>
            
            <div className="grid gap-5">
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 flex-shrink-0 mt-1" />
                <div className="space-y-1">
                  <strong className="font-medium text-foreground">Text-Based Editing</strong>
                  <p className="text-muted-foreground font-light">Delete transcript segments to automatically trim video</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 flex-shrink-0 mt-1" />
                <div className="space-y-1">
                  <strong className="font-medium text-foreground">Scene Composition</strong>
                  <p className="text-muted-foreground font-light">Combine multiple videos with layouts and transitions</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 flex-shrink-0 mt-1" />
                <div className="space-y-1">
                  <strong className="font-medium text-foreground">AI Assistant</strong>
                  <p className="text-muted-foreground font-light">Underlord-style editing assistant with natural language commands</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 flex-shrink-0 mt-1" />
                <div className="space-y-1">
                  <strong className="font-medium text-foreground">Caption Templates</strong>
                  <p className="text-muted-foreground font-light">10 professional CWI presets + custom template creator</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 flex-shrink-0 mt-1" />
                <div className="space-y-1">
                  <strong className="font-medium text-foreground">Advanced Exports</strong>
                  <p className="text-muted-foreground font-light">AAF timeline, DOCX transcript, separate SRT/VTT files</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button 
              variant="outline" 
              size="lg"
              className="flex-1 font-light rounded-full h-auto py-4"
              onClick={() => navigate(-1)}
            >
              Go Back
            </Button>
            <Button 
              variant="default" 
              size="lg"
              className="flex-1 font-light rounded-full h-auto py-4"
              onClick={() => navigate('/pricing')}
            >
              <Crown className="w-5 h-5 mr-2" />
              Upgrade to Standard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

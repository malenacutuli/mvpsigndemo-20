import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface LoadingScreenProps {
  message?: string;
  progress?: number;
}

export function LoadingScreen({ 
  message = 'Loading Premium Editor...', 
  progress 
}: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
      <Card className="max-w-md w-full p-12 text-center space-y-8 border shadow-lg">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <Loader2 className="w-16 h-16 animate-spin text-primary relative" />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-semibold">Premium Editor</h2>
          <p className="text-muted-foreground">{message}</p>
        </div>

        {progress !== undefined && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground">{Math.round(progress)}%</p>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-150" />
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-300" />
        </div>
      </Card>
    </div>
  );
}

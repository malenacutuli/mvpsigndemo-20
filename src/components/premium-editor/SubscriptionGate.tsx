import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, CheckCircle2, Sparkles, FileText, Scissors, Film, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface SubscriptionGateProps {
  currentTier: string;
  videoId: string;
}

export function SubscriptionGate({ currentTier, videoId }: SubscriptionGateProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/10 to-background p-4">
      <Card className="max-w-4xl w-full border shadow-elegant">
        <CardHeader className="text-center space-y-6 pt-16 pb-8">
          <div className="flex justify-center">
            <div className="relative">
              <Crown className="w-24 h-24 text-primary animate-pulse" />
              <Sparkles className="w-6 h-6 text-primary-glow absolute -top-2 -right-2" />
            </div>
          </div>
          <CardTitle className="text-5xl md:text-6xl font-light text-foreground tracking-tight">
            Premium Video Editor
          </CardTitle>
          <p className="text-lg md:text-xl text-muted-foreground font-light max-w-2xl mx-auto">
            You're currently on the <strong className="text-foreground font-medium">{currentTier}</strong> plan
          </p>
        </CardHeader>
        <CardContent className="space-y-10 px-8 md:px-12 pb-16">
          <div className="bg-gradient-to-br from-muted/50 to-accent/20 rounded-2xl p-8 md:p-10 space-y-8 backdrop-blur-sm">
            <p className="text-center text-xl md:text-2xl font-light text-foreground leading-relaxed">
              Premium Video Editor is available on <strong className="font-semibold text-primary">Standard plan and above</strong>
            </p>
            
            <div className="grid gap-6 md:gap-7">
              <div className="flex items-start gap-5 group hover:translate-x-1 transition-transform">
                <div className="w-10 h-10 flex-shrink-0 mt-0.5 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="font-semibold text-lg text-foreground">Text-Based Editing</h3>
                  <p className="text-muted-foreground font-light leading-relaxed">Delete transcript segments to automatically trim video with precision</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-primary/60 flex-shrink-0 mt-1" />
              </div>

              <div className="flex items-start gap-5 group hover:translate-x-1 transition-transform">
                <div className="w-10 h-10 flex-shrink-0 mt-0.5 rounded-full bg-primary/10 flex items-center justify-center">
                  <Film className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="font-semibold text-lg text-foreground">Scene Composition</h3>
                  <p className="text-muted-foreground font-light leading-relaxed">Combine multiple videos with professional layouts and smooth transitions</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-primary/60 flex-shrink-0 mt-1" />
              </div>

              <div className="flex items-start gap-5 group hover:translate-x-1 transition-transform">
                <div className="w-10 h-10 flex-shrink-0 mt-0.5 rounded-lg overflow-hidden bg-background flex items-center justify-center">
                  <img src="/assets/axessible-logo-assistant.avif" alt="Axessible" className="w-full h-full object-contain" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="font-semibold text-lg text-foreground">{t('premiumEditor.features.aiAssistant.title')}</h3>
                  <p className="text-muted-foreground font-light leading-relaxed">{t('premiumEditor.features.aiAssistant.description')}</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-primary/60 flex-shrink-0 mt-1" />
              </div>

              <div className="flex items-start gap-5 group hover:translate-x-1 transition-transform">
                <div className="w-10 h-10 flex-shrink-0 mt-0.5 rounded-full bg-primary/10 flex items-center justify-center">
                  <Scissors className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="font-semibold text-lg text-foreground">Caption Templates</h3>
                  <p className="text-muted-foreground font-light leading-relaxed">10 professional CWI presets + custom template creator</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-primary/60 flex-shrink-0 mt-1" />
              </div>

              <div className="flex items-start gap-5 group hover:translate-x-1 transition-transform">
                <div className="w-10 h-10 flex-shrink-0 mt-0.5 rounded-full bg-primary/10 flex items-center justify-center">
                  <Download className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="font-semibold text-lg text-foreground">Advanced Exports</h3>
                  <p className="text-muted-foreground font-light leading-relaxed">AAF timeline, DOCX transcript, separate SRT/VTT files</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-primary/60 flex-shrink-0 mt-1" />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-5 pt-6">
            <Button 
              variant="outline" 
              size="lg"
              className="flex-1 font-light rounded-full h-auto py-4 px-8 text-base border-2 hover:border-primary/50 transition-all"
              onClick={() => navigate(-1)}
            >
              Go Back
            </Button>
            <Button 
              size="lg"
              className="flex-1 font-light rounded-full h-auto py-4 px-8 text-base bg-gradient-to-r from-primary to-primary-glow hover:shadow-elegant transition-all"
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

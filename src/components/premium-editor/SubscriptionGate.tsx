import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Zap, Sparkles } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <Card className="max-w-3xl w-full border-none shadow-soft">
        <CardHeader className="text-center space-y-6 pt-12">
          <div className="flex justify-center">
            <Crown className="w-20 h-20 text-primary" />
          </div>
          <CardTitle className="text-4xl md:text-5xl font-light text-foreground">
            {t('premiumEditor.title')}
          </CardTitle>
          <p className="text-base md:text-lg text-muted-foreground font-light">
            {t('premiumEditor.currentPlan', { tier: currentTier })}
          </p>
        </CardHeader>
        <CardContent className="space-y-8 px-8 pb-12">
          <div className="bg-muted/30 rounded-2xl p-8 space-y-6">
            <p className="text-center text-lg md:text-xl font-light text-foreground">
              {t('premiumEditor.availability')}
            </p>
            
            <div className="grid gap-5">
              <div className="flex items-start gap-4">
                <Zap className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div className="space-y-1">
                  <strong className="font-medium text-foreground">{t('premiumEditor.features.textEditing.title')}</strong>
                  <p className="text-muted-foreground font-light">{t('premiumEditor.features.textEditing.description')}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Sparkles className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div className="space-y-1">
                  <strong className="font-medium text-foreground">{t('premiumEditor.features.sceneComposition.title')}</strong>
                  <p className="text-muted-foreground font-light">{t('premiumEditor.features.sceneComposition.description')}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Sparkles className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div className="space-y-1">
                  <strong className="font-medium text-foreground">{t('premiumEditor.features.aiAssistant.title')}</strong>
                  <p className="text-muted-foreground font-light">{t('premiumEditor.features.aiAssistant.description')}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Sparkles className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div className="space-y-1">
                  <strong className="font-medium text-foreground">{t('premiumEditor.features.captionTemplates.title')}</strong>
                  <p className="text-muted-foreground font-light">{t('premiumEditor.features.captionTemplates.description')}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Sparkles className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div className="space-y-1">
                  <strong className="font-medium text-foreground">{t('premiumEditor.features.advancedExports.title')}</strong>
                  <p className="text-muted-foreground font-light">{t('premiumEditor.features.advancedExports.description')}</p>
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
              {t('premiumEditor.goBack')}
            </Button>
            <Button 
              variant="default" 
              size="lg"
              className="flex-1 font-light rounded-full h-auto py-4"
              onClick={() => navigate('/pricing')}
            >
              <Crown className="w-5 h-5 mr-2" />
              {t('premiumEditor.upgradeButton')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Eye, Check } from 'lucide-react';
import { CaptionTemplate } from '@/hooks/useCaptionTemplates';

interface TemplateCardProps {
  template: CaptionTemplate;
  onPreview: () => void;
  onApply: () => void;
  canAccessPremium: boolean;
  applyingToScene: boolean;
}

export function TemplateCard({
  template,
  onPreview,
  onApply,
  canAccessPremium,
  applyingToScene
}: TemplateCardProps) {
  const isPremiumLocked = template.is_premium && !canAccessPremium;

  return (
    <Card className={`relative overflow-hidden hover:shadow-lg transition-shadow ${
      isPremiumLocked ? 'opacity-75' : ''
    }`}>
      {template.is_premium && (
        <Badge className="absolute top-2 right-2 z-10" variant="secondary">
          <Crown className="w-3 h-3 mr-1" />
          Premium
        </Badge>
      )}

      <CardContent className="p-4">
        {/* Preview Image (generate from style_config) */}
        <div 
          className="w-full h-32 rounded-md mb-3 flex items-center justify-center text-center"
          style={{
            background: template.style_config.background?.enabled
              ? template.style_config.background.color
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            fontFamily: template.style_config.fontFamily,
            fontSize: template.style_config.fontSize / 4,
            fontWeight: template.style_config.fontWeight,
            color: template.style_config.colors.main,
            padding: '8px',
            position: 'relative'
          }}
        >
          <span 
            style={{
              textShadow: template.style_config.shadow?.enabled
                ? `${template.style_config.shadow.offsetX}px ${template.style_config.shadow.offsetY}px ${template.style_config.shadow.blur}px ${template.style_config.shadow.color}`
                : 'none',
              WebkitTextStroke: template.style_config.stroke?.enabled
                ? `${template.style_config.stroke.width / 2}px ${template.style_config.stroke.color}`
                : 'none'
            }}
          >
            Sample Caption
          </span>
        </div>

        <h3 className="font-semibold mb-1">{template.name}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {template.description}
        </p>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreview}
          className="flex-1"
        >
          <Eye className="w-3 h-3 mr-1" />
          Preview
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onApply}
          disabled={isPremiumLocked}
          className="flex-1"
        >
          <Check className="w-3 h-3 mr-1" />
          {applyingToScene ? 'Apply to Scene' : 'Apply to All'}
        </Button>
      </CardFooter>

      {isPremiumLocked && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center p-4">
            <Crown className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium">Advanced Plan Required</p>
          </div>
        </div>
      )}
    </Card>
  );
}

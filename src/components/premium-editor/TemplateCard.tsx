import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Eye } from 'lucide-react';
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
  const isLocked = template.is_premium && !canAccessPremium;

  return (
    <Card className={`group relative overflow-hidden transition-all hover:shadow-lg ${isLocked ? 'opacity-60' : ''}`}>
      {/* Preview Image or Style Demo */}
      <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/10 relative overflow-hidden">
        {template.preview_url ? (
          <img 
            src={template.preview_url} 
            alt={template.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full p-4">
            <div 
              className="text-center"
              style={{
                fontFamily: template.style_config.fontFamily,
                fontSize: `${Math.min(template.style_config.fontSize / 3, 20)}px`,
                fontWeight: template.style_config.fontWeight,
                color: template.style_config.colors.main
              }}
            >
              Sample Text
            </div>
          </div>
        )}
        
        {isLocked && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <Crown className="w-8 h-8 text-primary" />
          </div>
        )}

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button size="sm" variant="secondary" onClick={onPreview}>
            <Eye className="w-4 h-4 mr-1" />
            Preview
          </Button>
          {!isLocked && (
            <Button size="sm" onClick={onApply}>
              Apply {applyingToScene ? 'to Scene' : 'to All'}
            </Button>
          )}
        </div>
      </div>

      {/* Template Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm line-clamp-1">{template.name}</h3>
          {template.is_premium && (
            <Badge variant="secondary" className="shrink-0">
              <Crown className="w-3 h-3" />
            </Badge>
          )}
        </div>
        {template.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {template.description}
          </p>
        )}
      </div>
    </Card>
  );
}

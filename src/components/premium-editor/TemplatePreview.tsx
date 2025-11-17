import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCaptionTemplates } from '@/hooks/useCaptionTemplates';
import { X } from 'lucide-react';

interface TemplatePreviewProps {
  templateId: string;
  premiumVideoId: string;
  onClose: () => void;
  onApply: () => void;
}

export function TemplatePreview({
  templateId,
  premiumVideoId,
  onClose,
  onApply
}: TemplatePreviewProps) {
  const { data: templates } = useCaptionTemplates();
  const template = templates?.find(t => t.id === templateId);

  if (!template) return null;

  const { style_config } = template;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Live Preview Area */}
          <div className="aspect-video bg-muted rounded-lg relative overflow-hidden flex items-center justify-center">
            <div
              className="absolute"
              style={{
                fontFamily: style_config.fontFamily,
                fontSize: `${style_config.fontSize}px`,
                fontWeight: style_config.fontWeight,
                color: style_config.colors.main,
                textAlign: style_config.textAlign as any,
                lineHeight: style_config.lineHeight,
                maxWidth: `${style_config.maxWidth}%`,
                ...(style_config.background?.enabled && {
                  backgroundColor: style_config.background.color,
                  opacity: style_config.background.opacity,
                  padding: `${style_config.background.padding}px`,
                  borderRadius: style_config.background.borderRadius ? `${style_config.background.borderRadius}px` : undefined
                }),
                ...(style_config.shadow?.enabled && {
                  textShadow: `${style_config.shadow.offsetX}px ${style_config.shadow.offsetY}px ${style_config.shadow.blur}px ${style_config.shadow.color}`
                }),
                ...(style_config.stroke?.enabled && {
                  WebkitTextStroke: `${style_config.stroke.width}px ${style_config.stroke.color}`
                })
              }}
            >
              This is a preview of how your captions will look with this template
            </div>
          </div>

          {/* Template Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Font:</span>{' '}
              <span className="font-medium">{style_config.fontFamily}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Size:</span>{' '}
              <span className="font-medium">{style_config.fontSize}px</span>
            </div>
            <div>
              <span className="text-muted-foreground">Position:</span>{' '}
              <span className="font-medium capitalize">
                {style_config.position.vertical} {style_config.position.horizontal}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Animation:</span>{' '}
              <span className="font-medium capitalize">
                {style_config.animation?.entrance || 'None'}
              </span>
            </div>
          </div>

          {template.description && (
            <p className="text-sm text-muted-foreground">{template.description}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onApply}>
            Apply Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

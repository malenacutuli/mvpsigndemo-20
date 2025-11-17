import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCaptionTemplates } from '@/hooks/useCaptionTemplates';
import { Check, X } from 'lucide-react';

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
  const { data: templates = [] } = useCaptionTemplates();
  const template = templates.find(t => t.id === templateId);

  if (!template) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{template.name} - Preview</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Video Player with Template Applied (simplified for now) */}
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <div 
              className="text-center p-8"
              style={{
                fontFamily: template.style_config.fontFamily,
                fontSize: template.style_config.fontSize,
                fontWeight: template.style_config.fontWeight,
                color: template.style_config.colors.main,
                backgroundColor: template.style_config.background?.enabled
                  ? `${template.style_config.background.color}${Math.round(template.style_config.background.opacity * 255).toString(16)}`
                  : 'transparent',
                padding: template.style_config.background?.padding,
                borderRadius: template.style_config.background?.borderRadius,
                textShadow: template.style_config.shadow?.enabled
                  ? `${template.style_config.shadow.offsetX}px ${template.style_config.shadow.offsetY}px ${template.style_config.shadow.blur}px ${template.style_config.shadow.color}`
                  : 'none'
              }}
            >
              This is how your captions will look
            </div>
          </div>

          {/* Template Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Font:</span> {template.style_config.fontFamily}
            </div>
            <div>
              <span className="font-medium">Size:</span> {template.style_config.fontSize}px
            </div>
            <div>
              <span className="font-medium">Alignment:</span> {template.style_config.textAlign}
            </div>
            <div>
              <span className="font-medium">Character Colors:</span>{' '}
              {template.style_config.characterColors ? 'Enabled' : 'Disabled'}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button variant="default" onClick={onApply}>
              <Check className="w-4 h-4 mr-2" />
              Apply Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

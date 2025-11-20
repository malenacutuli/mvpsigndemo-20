import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useCaptionTemplates, useApplyTemplate, type CaptionTemplate } from '@/hooks/useCaptionTemplates';
import { Sparkles, Search, Crown, Play, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CaptionTemplateGalleryProps {
  videoId?: string;
  projectId?: string;
  currentSceneId?: string;
  userTier?: string;
  onTemplateSelect?: (template: CaptionTemplate) => void;
}

export function CaptionTemplateGallery({
  videoId,
  projectId,
  currentSceneId,
  userTier = 'free',
  onTemplateSelect
}: CaptionTemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'free' | 'premium'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CaptionTemplate | null>(null);

  const { data: templates = [], isLoading } = useCaptionTemplates();
  const applyTemplate = useApplyTemplate();
  const { toast } = useToast();

  const canAccessPremium = ['advanced', 'enterprise'].includes(userTier.toLowerCase());

  const filteredTemplates = templates.filter(template => {
    // Search filter
    if (searchQuery && !template.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Type filter
    if (filterType === 'free' && template.is_premium) return false;
    if (filterType === 'premium' && !template.is_premium) return false;

    return true;
  });

  const handleApply = async (template: CaptionTemplate) => {
    try {
      if (onTemplateSelect) {
        onTemplateSelect(template);
      }

      if (projectId) {
        await applyTemplate.mutateAsync({
          projectId,
          templateId: template.id,
          sceneId: currentSceneId
        });
      }

      setSelectedTemplate(template.id);
      
      toast({
        title: 'Template Applied',
        description: `"${template.name}" applied successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to apply template',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Tabs value={filterType} onValueChange={(v) => setFilterType(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="free">Free</TabsTrigger>
            <TabsTrigger value="premium">
              <Crown className="w-3 h-3 mr-1" />
              Premium
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Template Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card 
              key={template.id} 
              className={`cursor-pointer hover:shadow-lg transition-all ${
                selectedTemplate === template.id ? 'ring-2 ring-primary' : ''
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription className="text-sm mt-1">
                        {template.description}
                      </CardDescription>
                    )}
                  </div>
                  {template.is_premium && (
                    <Badge variant="secondary" className="ml-2">
                      <Crown className="w-3 h-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                  {selectedTemplate === template.id && (
                    <Badge variant="default" className="ml-2">
                      <Check className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {/* Live caption preview */}
                <div 
                  className="relative aspect-video rounded-lg overflow-hidden bg-black/90 flex items-end justify-center p-4"
                  style={{
                    backgroundImage: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.7))'
                  }}
                >
                  <div
                    className="caption-preview transition-all"
                    style={{
                      fontFamily: template.style_config.fontFamily,
                      fontSize: `${template.style_config.fontSize}px`,
                      fontWeight: template.style_config.fontWeight,
                      textAlign: template.style_config.textAlign as any,
                      lineHeight: template.style_config.lineHeight,
                      color: template.style_config.colors.main,
                      backgroundColor: template.style_config.background?.enabled 
                        ? template.style_config.background.color 
                        : 'transparent',
                      padding: template.style_config.background?.padding 
                        ? `${template.style_config.background.padding}px` 
                        : '8px 16px',
                      borderRadius: template.style_config.background?.borderRadius 
                        ? `${template.style_config.background.borderRadius}px` 
                        : '4px',
                      textShadow: template.style_config.shadow?.enabled
                        ? `${template.style_config.shadow.offsetX}px ${template.style_config.shadow.offsetY}px ${template.style_config.shadow.blur}px ${template.style_config.shadow.color}`
                        : 'none',
                      WebkitTextStroke: template.style_config.stroke?.enabled
                        ? `${template.style_config.stroke.width}px ${template.style_config.stroke.color}`
                        : 'none',
                      maxWidth: `${template.style_config.maxWidth}%`,
                    }}
                  >
                    Sample Caption Text
                  </div>
                </div>

                {/* Template stats */}
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{template.usage_count || 0} uses</span>
                  <span>•</span>
                  <span>{template.template_type}</span>
                </div>
              </CardContent>

              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setPreviewTemplate(template)}
                >
                  <Play className="w-4 h-4 mr-1" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleApply(template)}
                  disabled={template.is_premium && !canAccessPremium}
                >
                  Apply
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {filteredTemplates.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>No templates found matching your search</p>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{previewTemplate.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
                <div
                  style={{
                    fontFamily: previewTemplate.style_config.fontFamily,
                    fontSize: `${previewTemplate.style_config.fontSize * 1.5}px`,
                    fontWeight: previewTemplate.style_config.fontWeight,
                    color: previewTemplate.style_config.colors.main,
                    textAlign: previewTemplate.style_config.textAlign as any,
                    padding: '16px 24px',
                    backgroundColor: previewTemplate.style_config.background?.enabled
                      ? previewTemplate.style_config.background.color
                      : 'transparent',
                  }}
                >
                  This is a full preview of the caption template
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPreviewTemplate(null)} className="flex-1">
                  Close
                </Button>
                <Button onClick={() => {
                  handleApply(previewTemplate);
                  setPreviewTemplate(null);
                }} className="flex-1">
                  Apply Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
